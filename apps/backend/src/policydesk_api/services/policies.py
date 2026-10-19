from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.repositories import policies as repository


def list_policies(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    return [_map_policy(row) for row in repository.list_policy_rows(user.supabase, workspace_id)]


def create_policy(user: AuthenticatedUser, workspace_id: str, payload: Any) -> dict:
    values = payload.model_dump(by_alias=False)
    values.update({"workspace_id": workspace_id, "owner_id": user.id, "created_by": user.name})
    return _map_policy(repository.create_policy_row(user.supabase, values))


def update_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str, payload: Any) -> dict:
    return _map_policy(repository.update_policy_row(user.supabase, policy_id, workspace_id, payload.model_dump(by_alias=False)))


def set_policy_status(user: AuthenticatedUser, workspace_id: str, policy_id: str, status: str) -> dict:
    return _map_policy(repository.set_policy_status_row(user.supabase, policy_id, workspace_id, status))


def delete_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str) -> None:
    repository.delete_policy_row(user.supabase, policy_id, workspace_id)


def list_policy_activity(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    return [{
        "id": row["id"], "workspaceId": row["workspace_id"], "policyId": row["policy_id"],
        "policyName": row["policy_name"], "type": row["activity_type"], "occurredAt": row["occurred_at"],
    } for row in repository.list_activity_rows(user.supabase, workspace_id)]


def record_policy_activity(user: AuthenticatedUser, workspace_id: str, policy_id: str, policy_name: str, activity_type: str) -> None:
    repository.create_activity_row(user.supabase, workspace_id, user.id, policy_id, policy_name, activity_type)


def _map_policy(row: dict) -> dict:
    return {
        "id": row["id"], "workspaceId": row["workspace_id"], "name": row["name"],
        "description": row.get("description") or "", "labels": row.get("labels") or [],
        "status": row["status"], "effectiveFrom": row.get("effective_from"),
        "effectiveUntil": row.get("effective_until"), "ownerId": row.get("owner_id") or "",
        "createdBy": row.get("created_by") or "", "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }
