import base64
import hashlib
import hmac
import json
import logging
import time
from collections import Counter
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlencode

from fastapi import HTTPException

from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.core.config import get_settings
from policydesk_api.core.supabase import get_admin_client
from policydesk_api.integrations.github import GitHubError, GitHubNotFound, get_github_app
from policydesk_api.repositories import repository_integrations as repository
from policydesk_api.services import repository_sync
from policydesk_api.services.workspace_access import is_active_admin, require_admin

logger = logging.getLogger("policydesk.api.repository_connections")

STATE_TTL_SECONDS = 600
ADMIN_ONLY = "Only workspace admins can connect GitHub or manage its repositories."
CallbackReason = Literal["invalid_state", "expired_state", "not_admin", "installation_not_found", "installation_not_accessible", "already_connected", "github_error"]


@dataclass(frozen=True)
class InstallState:
    workspace_id: str
    user_id: str


class CallbackRejected(Exception):
    def __init__(self, reason: CallbackReason, workspace_id: str | None = None) -> None:
        super().__init__(reason)
        self.reason, self.workspace_id = reason, workspace_id


def sign_install_state(workspace_id: str, user_id: str, secret: str, now: float | None = None) -> str:
    expires = int(now if now is not None else time.time()) + STATE_TTL_SECONDS
    payload = _b64encode(json.dumps({"w": workspace_id, "u": user_id, "e": expires}, separators=(",", ":")).encode())
    return f"{payload}.{_b64encode(_state_mac(secret, payload))}"


def verify_install_state(state: str, secret: str, now: float | None = None) -> InstallState:
    payload, _, signature = state.partition(".")
    try:
        valid = bool(secret) and hmac.compare_digest(_b64decode(signature), _state_mac(secret, payload))
        data = json.loads(_b64decode(payload)) if valid else None
    except ValueError:
        data = None
    if not isinstance(data, dict) or not all(isinstance(data.get(key), expected) for key, expected in (("w", str), ("u", str), ("e", int))):
        raise CallbackRejected("invalid_state")
    if data["e"] <= (now if now is not None else time.time()):
        raise CallbackRejected("expired_state", data["w"])
    return InstallState(workspace_id=data["w"], user_id=data["u"])


def github_install_url(user: AuthenticatedUser, workspace_id: str) -> dict:
    require_admin(user.supabase, workspace_id, user.id, ADMIN_ONLY)
    app = get_github_app()
    if not app.configured:
        raise HTTPException(status_code=503, detail="GitHub connections are not set up on this server yet. Ask the person who runs Policy Desk to configure the GitHub App.")
    return {"url": app.install_url(sign_install_state(workspace_id, user.id, get_settings().github_app_client_secret))}


def complete_github_installation(installation_id: str | None, state: str | None, code: str | None) -> tuple[str, dict | None]:
    """Link a GitHub installation to the workspace in the signed state. Returns the redirect URL and the new connection."""
    workspace_id = None
    try:
        install_state = verify_install_state(state or "", get_settings().github_app_client_secret)
        workspace_id = install_state.workspace_id
        connection = _link_installation(install_state, installation_id, code)
    except CallbackRejected as rejection:
        workspace_id = workspace_id or rejection.workspace_id
        logger.warning("GitHub installation rejected workspace_id=%s reason=%s", workspace_id, rejection.reason)
        return _callback_url(workspace_id, {"github": "error", "reason": rejection.reason}), None
    logger.info("GitHub installation connected workspace_id=%s installation_id=%s", workspace_id, connection["installation_id"])
    return _callback_url(workspace_id, {"github": "connected"}), connection


def list_connections(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    repositories = repository.list_repository_rows(user.supabase, workspace_id)
    open_counts = Counter(repository.list_open_request_repository_ids(user.supabase, workspace_id))
    return [
        _map_connection(row, [repo for repo in repositories if repo["connection_id"] == row["id"]], open_counts)
        for row in repository.list_connection_rows(user.supabase, workspace_id)
    ]


def sync_connection(user: AuthenticatedUser, workspace_id: str, connection_id: str) -> dict:
    require_admin(user.supabase, workspace_id, user.id, ADMIN_ONLY)
    connection = _get_connection(user, workspace_id, connection_id)
    if connection["status"] == "suspended":
        raise HTTPException(status_code=409, detail="This GitHub installation is suspended. Unsuspend it on GitHub, then sync again.")
    try:
        repository_sync.sync_connection(connection)
    except GitHubError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return list_connection(user, workspace_id, connection_id)


def list_connection(user: AuthenticatedUser, workspace_id: str, connection_id: str) -> dict:
    repositories = repository.list_repository_rows(user.supabase, workspace_id, connection_id)
    return _map_connection(_get_connection(user, workspace_id, connection_id), repositories, Counter(repository.list_open_request_repository_ids(user.supabase, workspace_id)))


def set_linked_repositories(user: AuthenticatedUser, workspace_id: str, connection_id: str, repository_ids: list[str]) -> tuple[dict, list[str]]:
    """Follow exactly the given repositories. Returns the connection and the repositories that still need their first import."""
    require_admin(user.supabase, workspace_id, user.id, ADMIN_ONLY)
    connection = _get_connection(user, workspace_id, connection_id)
    if connection["status"] == "suspended":
        raise HTTPException(status_code=409, detail="This GitHub installation is suspended. Unsuspend it on GitHub, then try again.")
    admin = get_admin_client()
    rows = repository.list_repository_rows(admin, workspace_id, connection_id)
    wanted = set(repository_ids)
    if wanted - {row["id"] for row in rows}:
        raise HTTPException(status_code=422, detail="Some of these repositories are no longer available to the GitHub App. Refresh the page and try again.")
    newly_linked = [row["id"] for row in rows if row["id"] in wanted and not row["is_linked"]]
    unlinked = [row["id"] for row in rows if row["id"] not in wanted and row["is_linked"]]
    repository.update_repository_rows(admin, newly_linked, workspace_id, {"is_linked": True, "sync_status": "syncing", "sync_error": None})
    repository.delete_request_rows_for_repositories(admin, unlinked, workspace_id)
    repository.update_repository_rows(admin, unlinked, workspace_id, {"is_linked": False, "sync_status": "idle", "sync_error": None, "last_synced_at": None})
    return connection, newly_linked


def disconnect(user: AuthenticatedUser, workspace_id: str, connection_id: str) -> None:
    require_admin(user.supabase, workspace_id, user.id, ADMIN_ONLY)
    # Only local rows are removed; uninstalling the app stays a GitHub-side decision.
    if not repository.delete_connection_row(get_admin_client(), connection_id, workspace_id):
        raise HTTPException(status_code=404, detail="This GitHub connection could not be found. Refresh the page and try again.")


def _link_installation(install_state: InstallState, installation_id: str | None, code: str | None) -> dict:
    workspace_id = install_state.workspace_id
    admin, app = get_admin_client(), get_github_app()
    # The state was signed for an admin, but membership may have changed during the install.
    if not is_active_admin(admin, workspace_id, install_state.user_id):
        raise CallbackRejected("not_admin")
    if not installation_id or not installation_id.isdigit():
        raise CallbackRejected("installation_not_found")
    if not code:
        raise CallbackRejected("installation_not_accessible")
    try:
        # installation_id arrives in a URL anyone can craft; the OAuth code proves this user can reach it.
        if int(installation_id) not in app.user_installation_ids(code):
            raise CallbackRejected("installation_not_accessible")
        installation = app.get_installation(int(installation_id))
    except GitHubNotFound as error:
        raise CallbackRejected("installation_not_found") from error
    except GitHubError as error:
        raise CallbackRejected("github_error") from error
    existing = repository.get_connection_by_installation(admin, installation.id)
    if existing and existing["workspace_id"] != workspace_id:
        raise CallbackRejected("already_connected")
    return repository.upsert_connection_row(admin, {
        "workspace_id": workspace_id, "installation_id": installation.id, "account_login": installation.account_login,
        "account_type": installation.account_type, "status": "suspended" if installation.suspended else "active",
        "connected_by": install_state.user_id,
    })


def _get_connection(user: AuthenticatedUser, workspace_id: str, connection_id: str) -> dict:
    connection = repository.get_connection_row(user.supabase, connection_id, workspace_id)
    if not connection:
        raise HTTPException(status_code=404, detail="This GitHub connection could not be found. Refresh the page and try again.")
    return connection


def _callback_url(workspace_id: str | None, query: dict[str, str]) -> str:
    base = get_settings().app_base_url.rstrip("/")
    # Without a trusted workspace there is no workspace page to return to.
    path = f"/{workspace_id}/repositories" if workspace_id else "/"
    return f"{base}{path}?{urlencode(query)}"


def _state_mac(secret: str, payload: str) -> bytes:
    return hmac.new(secret.encode(), b"github-install-state." + payload.encode(), hashlib.sha256).digest()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _map_connection(row: dict, repositories: list[dict], open_counts: Counter) -> dict:
    return {
        "id": row["id"], "workspaceId": row["workspace_id"], "provider": row["provider"],
        "installationId": row["installation_id"], "accountLogin": row["account_login"], "accountType": row["account_type"],
        "status": row["status"], "connectedAt": row["created_at"],
        "manageUrl": get_github_app().installation_settings_url(row["account_login"], row["account_type"], row["installation_id"]),
        "repositories": [{
            "id": repo["id"], "connectionId": repo["connection_id"], "provider": repo["provider"],
            "owner": repo["owner"], "name": repo["name"], "fullName": repo["full_name"], "url": repo["html_url"],
            "defaultBranch": repo["default_branch"], "isPrivate": repo["is_private"], "isLinked": repo["is_linked"], "syncStatus": repo["sync_status"],
            "syncError": repo.get("sync_error"), "lastSyncedAt": repo.get("last_synced_at"),
            "openRequestCount": open_counts[repo["id"]],
        } for repo in repositories],
    }
