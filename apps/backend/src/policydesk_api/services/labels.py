from fastapi import HTTPException

from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.repositories import labels as repository


def list_labels(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    return [_map_label(row) for row in repository.list_label_rows(user.supabase, workspace_id)]


def create_label(user: AuthenticatedUser, workspace_id: str, raw_name: str) -> dict:
    name = _clean_name(raw_name)
    return _map_label(repository.create_label_row(user.supabase, workspace_id, user.id, user.name, name))


def update_label(user: AuthenticatedUser, workspace_id: str, label_id: str, raw_name: str) -> dict:
    name = _clean_name(raw_name)
    existing = repository.get_label_row(user.supabase, label_id, workspace_id)
    for policy in repository.list_policy_label_rows(user.supabase, workspace_id):
        labels = policy.get("labels") or []
        if existing["name"] in labels:
            repository.replace_policy_label(user.supabase, policy["id"], workspace_id, [name if label == existing["name"] else label for label in labels])
    return _map_label(repository.update_label_row(user.supabase, label_id, workspace_id, name))


def delete_label(user: AuthenticatedUser, workspace_id: str, label_id: str) -> None:
    existing = repository.get_label_row(user.supabase, label_id, workspace_id)
    for policy in repository.list_policy_label_rows(user.supabase, workspace_id):
        labels = policy.get("labels") or []
        if existing["name"] in labels:
            repository.replace_policy_label(user.supabase, policy["id"], workspace_id, [label for label in labels if label != existing["name"]])
    repository.delete_label_row(user.supabase, label_id, workspace_id)


def _clean_name(raw_name: str) -> str:
    name = raw_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter a label name.")
    return name


def _map_label(row: dict) -> dict:
    return {
        "id": row["id"], "workspaceId": row["workspace_id"], "name": row["name"],
        "ownerId": row.get("owner_id") or "", "createdBy": row.get("created_by") or "",
        "createdAt": row["created_at"],
    }
