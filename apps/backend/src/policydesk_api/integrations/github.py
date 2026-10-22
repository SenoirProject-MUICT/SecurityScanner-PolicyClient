import hashlib
import hmac
import logging
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Literal
from urllib.parse import urlencode

import httpx
import jwt

from policydesk_api.core.config import Settings, get_settings

logger = logging.getLogger("policydesk.api.github")

FileStatus = Literal["added", "modified", "removed", "renamed"]
RequestState = Literal["open", "closed", "merged"]

# GitHub's list-files endpoint stops at 3000 files per pull request.
MAX_PULL_REQUEST_FILES = 3000
MAX_RETRIES = 2
FILE_STATUSES: dict[str, FileStatus] = {"added": "added", "copied": "added", "removed": "removed", "renamed": "renamed"}


class GitHubError(Exception):
    """A GitHub failure with a message that is safe to show to workspace members."""


class GitHubNotFound(GitHubError):
    pass


class GitHubRateLimited(GitHubError):
    pass


@dataclass(frozen=True)
class Installation:
    id: int
    account_login: str
    account_type: Literal["User", "Organization"]
    suspended: bool


@dataclass(frozen=True)
class Repository:
    id: int
    owner: str
    name: str
    full_name: str
    html_url: str
    default_branch: str
    is_private: bool


@dataclass(frozen=True)
class PullRequest:
    id: int
    number: int
    title: str
    body: str
    html_url: str
    state: RequestState
    is_draft: bool
    author_login: str
    author_avatar_url: str | None
    source_branch: str
    target_branch: str
    head_sha: str
    base_sha: str
    created_at: str
    updated_at: str
    closed_at: str | None
    merged_at: str | None


@dataclass(frozen=True)
class ChangedFile:
    filename: str
    previous_filename: str | None
    status: FileStatus
    additions: int
    deletions: int
    changes: int
    patch: str | None
    blob_sha: str | None


def parse_installation(data: dict) -> Installation:
    account = data.get("account") or {}
    return Installation(
        id=int(data["id"]), account_login=account.get("login") or "",
        account_type="Organization" if account.get("type") == "Organization" else "User",
        suspended=bool(data.get("suspended_at")),
    )


def parse_repository(data: dict) -> Repository:
    return Repository(
        id=int(data["id"]), owner=(data.get("owner") or {}).get("login") or "", name=data["name"],
        full_name=data["full_name"], html_url=data["html_url"], default_branch=data.get("default_branch") or "",
        is_private=bool(data.get("private")),
    )


def parse_pull_request(data: dict) -> PullRequest:
    user = data.get("user") or {}
    head, base = data.get("head") or {}, data.get("base") or {}
    state: RequestState = "merged" if data.get("merged_at") else "open" if data.get("state") == "open" else "closed"
    return PullRequest(
        id=int(data["id"]), number=int(data["number"]), title=data.get("title") or "", body=data.get("body") or "",
        html_url=data["html_url"], state=state, is_draft=bool(data.get("draft")),
        author_login=user.get("login") or "", author_avatar_url=user.get("avatar_url"),
        source_branch=head.get("ref") or "", target_branch=base.get("ref") or "",
        head_sha=head.get("sha") or "", base_sha=base.get("sha") or "",
        created_at=data["created_at"], updated_at=data["updated_at"],
        closed_at=data.get("closed_at"), merged_at=data.get("merged_at"),
    )


def parse_changed_file(data: dict) -> ChangedFile:
    return ChangedFile(
        filename=data["filename"], previous_filename=data.get("previous_filename"),
        status=FILE_STATUSES.get(data.get("status") or "", "modified"),
        additions=int(data.get("additions") or 0), deletions=int(data.get("deletions") or 0),
        changes=int(data.get("changes") or 0), patch=data.get("patch"), blob_sha=data.get("sha"),
    )


def verify_webhook_signature(secret: str, body: bytes, signature: str | None) -> bool:
    if not secret or not signature or not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


class GitHubApp:
    def __init__(self, settings: Settings, http: httpx.Client | None = None) -> None:
        self.settings = settings
        self.api_url = settings.github_api_url.rstrip("/")
        # GitHub Enterprise Server serves the API under /api/v3 of the web host.
        self.web_url = "https://github.com" if self.api_url == "https://api.github.com" else self.api_url.removesuffix("/api/v3")
        self.http = http or httpx.Client(timeout=15)
        self._tokens: dict[int, tuple[str, float]] = {}
        self._tokens_lock = threading.Lock()

    @property
    def configured(self) -> bool:
        s = self.settings
        return all((s.github_app_id, s.github_app_slug, s.github_app_client_id, s.github_app_client_secret, s.github_app_private_key))

    def install_url(self, state: str) -> str:
        return f"{self.web_url}/apps/{self.settings.github_app_slug}/installations/new?{urlencode({'state': state})}"

    def installation_settings_url(self, account_login: str, account_type: str, installation_id: int) -> str:
        """Where an owner changes which repositories the installation can see."""
        owner = f"/organizations/{account_login}" if account_type == "Organization" else ""
        return f"{self.web_url}{owner}/settings/installations/{installation_id}"

    def app_jwt(self, now: float | None = None) -> str:
        issued = int(now if now is not None else time.time()) - 60  # tolerate clock drift with GitHub
        payload = {"iat": issued, "exp": issued + 540, "iss": self.settings.github_app_id}
        return jwt.encode(payload, self.settings.github_app_private_key, algorithm="RS256")

    def get_installation(self, installation_id: int) -> Installation:
        return parse_installation(self._request("GET", f"/app/installations/{installation_id}", self.app_jwt()).json())

    def installation_token(self, installation_id: int) -> str:
        with self._tokens_lock:
            cached = self._tokens.get(installation_id)
            if cached and cached[1] - 60 > time.time():
                return cached[0]
            data = self._request("POST", f"/app/installations/{installation_id}/access_tokens", self.app_jwt()).json()
            expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")).timestamp()
            self._tokens[installation_id] = (data["token"], expires_at)
            return data["token"]

    def list_installation_repositories(self, installation_id: int) -> list[Repository]:
        token = self.installation_token(installation_id)
        return [parse_repository(item) for item in self._paginate("/installation/repositories", token, key="repositories")]

    def list_open_pull_requests(self, installation_id: int, full_name: str) -> list[PullRequest]:
        token = self.installation_token(installation_id)
        return [parse_pull_request(item) for item in self._paginate(f"/repos/{full_name}/pulls", token, params={"state": "open"})]

    def get_pull_request(self, installation_id: int, full_name: str, number: int) -> PullRequest:
        token = self.installation_token(installation_id)
        return parse_pull_request(self._request("GET", f"/repos/{full_name}/pulls/{number}", token).json())

    def list_pull_request_files(self, installation_id: int, full_name: str, number: int) -> list[ChangedFile]:
        token = self.installation_token(installation_id)
        items = self._paginate(f"/repos/{full_name}/pulls/{number}/files", token, limit=MAX_PULL_REQUEST_FILES)
        return [parse_changed_file(item) for item in items]

    def user_installation_ids(self, code: str) -> set[int]:
        """Exchange the installing user's OAuth code and list the installations that user can access."""
        response = self._send("POST", f"{self.web_url}/login/oauth/access_token", headers={"Accept": "application/json"}, data={
            "client_id": self.settings.github_app_client_id, "client_secret": self.settings.github_app_client_secret, "code": code,
        })
        user_token = response.json().get("access_token") if response.is_success else None
        if not user_token:
            raise GitHubError("GitHub could not confirm who approved the installation. Try connecting again.")
        return {int(item["id"]) for item in self._paginate("/user/installations", user_token, key="installations")}

    def _paginate(self, path: str, token: str, params: dict | None = None, key: str | None = None, limit: int | None = None) -> list[dict]:
        items: list[dict] = []
        url: str | None = f"{self.api_url}{path}"
        query: dict | None = {**(params or {}), "per_page": 100}
        while url and (limit is None or len(items) < limit):
            response = self._send("GET", url, headers=self._headers(token), params=query)
            data = response.json()
            items.extend(data[key] if key else data)
            # The next link already carries every query parameter.
            url, query = response.links.get("next", {}).get("url"), None
        return items[:limit] if limit is not None else items

    def _request(self, method: str, path: str, token: str) -> httpx.Response:
        return self._send(method, f"{self.api_url}{path}", headers=self._headers(token))

    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}

    def _send(self, method: str, url: str, headers: dict[str, str], **kwargs: Any) -> httpx.Response:
        headers = {"User-Agent": "policydesk-api", **headers}
        failure: httpx.TransportError | None = None
        for attempt in range(MAX_RETRIES + 1):
            if attempt:
                time.sleep(0.5 * attempt)
            try:
                response = self.http.request(method, url, headers=headers, **kwargs)
            except httpx.TransportError as error:
                failure = error
                continue
            if response.status_code < 500 or attempt == MAX_RETRIES:
                return _raise_for_status(response)
        raise GitHubError("GitHub could not be reached. Try again in a few minutes.") from failure


def _raise_for_status(response: httpx.Response) -> httpx.Response:
    if response.is_success:
        return response
    status = response.status_code
    if status == 429 or (status == 403 and response.headers.get("x-ratelimit-remaining") == "0"):
        reset = response.headers.get("x-ratelimit-reset")
        minutes = max(1, round((int(reset) - time.time()) / 60)) if reset and reset.isdigit() else None
        wait = f"in about {minutes} minute{'s' if minutes != 1 else ''}" if minutes else "in a few minutes"
        raise GitHubRateLimited(f"GitHub's rate limit was reached. Sync again {wait}.")
    if status == 404:
        raise GitHubNotFound("GitHub could not find this resource, or the app no longer has access to it.")
    if status in (401, 403):
        raise GitHubError("GitHub denied access. Check that the Policy Desk app is still installed with read access to pull requests.")
    logger.warning("GitHub request failed status=%s method=%s path=%s", status, response.request.method, response.request.url.path)
    raise GitHubError("GitHub returned an unexpected error. Try again in a few minutes.")


@lru_cache
def get_github_app() -> GitHubApp:
    return GitHubApp(get_settings())
