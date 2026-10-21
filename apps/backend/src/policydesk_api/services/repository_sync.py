import logging
from collections import Counter
from datetime import UTC, datetime
from typing import Any, Literal

from policydesk_api.core.supabase import get_admin_client
from policydesk_api.integrations import github
from policydesk_api.integrations.github import (
    GitHubApp,
    GitHubError,
    GitHubNotFound,
    get_github_app,
)
from policydesk_api.repositories import repository_integrations as repository

logger = logging.getLogger("policydesk.api.repository_sync")

SyncStatus = Literal["idle", "syncing", "succeeded", "failed"]


def repository_values(connection: dict, repo: github.Repository) -> dict:
    return {
        "workspace_id": connection["workspace_id"], "connection_id": connection["id"], "provider_repository_id": repo.id,
        "owner": repo.owner, "name": repo.name, "full_name": repo.full_name, "html_url": repo.html_url,
        "default_branch": repo.default_branch, "is_private": repo.is_private,
    }


def request_values(repository_row: dict, pr: github.PullRequest, files: list[github.ChangedFile]) -> dict:
    counts = Counter(file.status for file in files)
    return {
        "workspace_id": repository_row["workspace_id"], "repository_id": repository_row["id"], "provider_request_id": pr.id,
        "number": pr.number, "title": pr.title, "description": pr.body, "html_url": pr.html_url, "state": pr.state,
        "is_draft": pr.is_draft, "author_login": pr.author_login, "author_avatar_url": pr.author_avatar_url,
        "source_branch": pr.source_branch, "target_branch": pr.target_branch, "head_sha": pr.head_sha, "base_sha": pr.base_sha,
        "files_added": counts["added"], "files_modified": counts["modified"], "files_removed": counts["removed"],
        "files_renamed": counts["renamed"], "additions": sum(file.additions for file in files),
        "deletions": sum(file.deletions for file in files), "provider_created_at": pr.created_at,
        "provider_updated_at": pr.updated_at, "closed_at": pr.closed_at, "merged_at": pr.merged_at,
    }


def file_values(file: github.ChangedFile) -> dict:
    return {
        "filename": file.filename, "previous_filename": file.previous_filename, "status": file.status,
        "additions": file.additions, "deletions": file.deletions, "changes": file.changes,
        "patch": file.patch, "blob_sha": file.blob_sha,
    }


def sync_connection(connection: dict) -> None:
    """Mirror the repositories the installation can see, then sync each one's pull requests."""
    admin, app = get_admin_client(), get_github_app()
    for repository_row in _mirror_repositories(admin, app, connection):
        _sync_repository(admin, app, connection, repository_row)


def refresh_pull_request(connection: dict, repository_row: dict, number: int) -> None:
    admin, app = get_admin_client(), get_github_app()
    _store_pull_request(admin, app, connection, repository_row, app.get_pull_request(connection["installation_id"], repository_row["full_name"], number))


def reconcile_all() -> dict[str, int]:
    """Re-sync every active connection to repair missed webhooks. Safe to run on any schedule."""
    connections = repository.list_active_connection_rows(get_admin_client())
    failed = 0
    for connection in connections:
        try:
            sync_connection(connection)
        except GitHubError as error:
            failed += 1
            logger.warning("Reconciliation failed connection_id=%s installation_id=%s error=%s", connection["id"], connection["installation_id"], error)
    return {"connections": len(connections), "failed": failed}


def _mirror_repositories(admin: Any, app: GitHubApp, connection: dict) -> list[dict]:
    visible = app.list_installation_repositories(connection["installation_id"])
    rows = repository.upsert_repository_rows(admin, [repository_values(connection, repo) for repo in visible])
    repository.delete_repositories_except(admin, connection["id"], connection["workspace_id"], [repo.id for repo in visible])
    return rows


def _sync_repository(admin: Any, app: GitHubApp, connection: dict, repository_row: dict) -> None:
    _set_sync_status(admin, repository_row, "syncing")
    try:
        _sync_pull_requests(admin, app, connection, repository_row)
    except GitHubError as error:
        _set_sync_status(admin, repository_row, "failed", str(error))
    except Exception:
        logger.exception("Repository sync crashed repository_id=%s", repository_row["id"])
        _set_sync_status(admin, repository_row, "failed", "Sync stopped because of an unexpected error. Try again.")
    else:
        _set_sync_status(admin, repository_row, "succeeded")


def _sync_pull_requests(admin: Any, app: GitHubApp, connection: dict, repository_row: dict) -> None:
    installation_id, full_name = connection["installation_id"], repository_row["full_name"]
    known_open = {row["provider_request_id"]: row["number"] for row in repository.list_open_request_rows(admin, repository_row["id"], repository_row["workspace_id"])}
    open_requests = app.list_open_pull_requests(installation_id, full_name)
    for pr in open_requests:
        _store_pull_request(admin, app, connection, repository_row, pr)
    # Rows still open locally but missing from GitHub's open list were closed or merged while no webhook arrived.
    for provider_request_id in known_open.keys() - {pr.id for pr in open_requests}:
        try:
            pr = app.get_pull_request(installation_id, full_name, known_open[provider_request_id])
        except GitHubNotFound:
            continue
        _store_pull_request(admin, app, connection, repository_row, pr)


def _store_pull_request(admin: Any, app: GitHubApp, connection: dict, repository_row: dict, pr: github.PullRequest) -> None:
    # Always refetch files: skipping "unchanged" requests would never repair a run that stopped between these writes.
    files = app.list_pull_request_files(connection["installation_id"], repository_row["full_name"], pr.number)
    row = repository.upsert_request_row(admin, request_values(repository_row, pr, files))
    repository.replace_request_file_rows(admin, row["id"], repository_row["workspace_id"], [file_values(file) for file in files])


def _set_sync_status(admin: Any, repository_row: dict, status: SyncStatus, error: str | None = None) -> None:
    values: dict = {"sync_status": status, "sync_error": error}
    if status == "succeeded":
        values["last_synced_at"] = datetime.now(UTC).isoformat()
    repository.update_repository_row(admin, repository_row["id"], repository_row["workspace_id"], values)
