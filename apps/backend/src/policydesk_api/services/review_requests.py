from fastapi import HTTPException

from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.repositories import repository_integrations as repository


def list_review_requests(user: AuthenticatedUser, workspace_id: str, repository_id: str | None, state: str) -> list[dict]:
    rows = repository.list_review_request_rows(user.supabase, workspace_id, repository_id, None if state == "all" else state)
    return [_map_review_request(row) for row in rows]


def get_review_request(user: AuthenticatedUser, workspace_id: str, request_id: str) -> dict:
    row = repository.get_review_request_row(user.supabase, request_id, workspace_id)
    if not row:
        raise HTTPException(status_code=404, detail="This review request could not be found. Refresh the page and try again.")
    files = repository.list_request_file_rows(user.supabase, request_id, workspace_id)
    return {**_map_review_request(row), "files": [{
        "id": file["id"], "path": file["filename"], "previousPath": file.get("previous_filename"), "status": file["status"],
        "additions": file["additions"], "deletions": file["deletions"], "changes": file["changes"], "patch": file.get("patch"),
    } for file in files]}


def _map_review_request(row: dict) -> dict:
    summary = {key: row[f"files_{key}"] for key in ("added", "modified", "removed", "renamed")}
    return {
        "id": row["id"], "workspaceId": row["workspace_id"], "repositoryId": row["repository_id"],
        "repositoryFullName": (row.get("repositories") or {}).get("full_name") or "", "provider": row["provider"],
        "number": row["number"], "title": row["title"], "description": row.get("description") or "", "url": row["html_url"],
        "state": row["state"], "isDraft": row["is_draft"],
        "author": {"login": row["author_login"], "avatarUrl": row.get("author_avatar_url")},
        "sourceBranch": row["source_branch"], "targetBranch": row["target_branch"], "headSha": row["head_sha"], "baseSha": row["base_sha"],
        "fileSummary": {**summary, "additions": row["additions"], "deletions": row["deletions"], "total": sum(summary.values())},
        "createdAt": row["provider_created_at"], "updatedAt": row["provider_updated_at"],
        "closedAt": row.get("closed_at"), "mergedAt": row.get("merged_at"), "lastSyncedAt": row["last_synced_at"],
    }
