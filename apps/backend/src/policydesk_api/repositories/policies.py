from datetime import UTC, datetime
from typing import Any


def list_policy_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policies").select("*").eq("workspace_id", workspace_id).order("updated_at", desc=True).execute().data or []


def get_policy_row(client: Any, policy_id: str, workspace_id: str) -> dict | None:
    return _maybe_data(client.table("policies").select("*").eq("id", policy_id).eq("workspace_id", workspace_id).maybe_single().execute())


def create_policy_row(client: Any, values: dict) -> dict:
    return client.table("policies").insert(values).select("*").single().execute().data


def update_policy_row(client: Any, policy_id: str, workspace_id: str, values: dict) -> dict:
    values["updated_at"] = datetime.now(UTC).isoformat()
    return client.table("policies").update(values).eq("id", policy_id).eq("workspace_id", workspace_id).select("*").single().execute().data


def transition_policy_row(client: Any, policy_id: str, workspace_id: str, from_statuses: list[str], version: int, values: dict) -> dict | None:
    """Apply a workflow change only if the policy is still in the reviewed state and version."""
    values["updated_at"] = datetime.now(UTC).isoformat()
    return _maybe_data(
        client.table("policies").update(values).eq("id", policy_id).eq("workspace_id", workspace_id)
        .in_("status", from_statuses).eq("version", version).select("*").maybe_single().execute()
    )


def delete_policy_row(client: Any, policy_id: str, workspace_id: str) -> None:
    client.table("policies").delete().eq("id", policy_id).eq("workspace_id", workspace_id).execute()


def count_active_admins(admin: Any, workspace_id: str) -> int:
    rows = admin.table("workspace_memberships").select("id").eq("workspace_id", workspace_id).eq("role", "admin").eq("status", "active").execute().data or []
    return len(rows)


def list_activity_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policy_activity").select("*").eq("workspace_id", workspace_id).order("occurred_at", desc=True).execute().data or []


def create_activity_row(client: Any, workspace_id: str, owner_id: str, policy_id: str, policy_name: str, activity_type: str) -> None:
    client.table("policy_activity").insert({
        "workspace_id": workspace_id, "owner_id": owner_id, "policy_id": policy_id,
        "policy_name": policy_name, "activity_type": activity_type,
    }).execute()


def list_approval_event_rows(client: Any, workspace_id: str, policy_id: str) -> list[dict]:
    return client.table("policy_approval_events").select("*").eq("workspace_id", workspace_id).eq("policy_id", policy_id).order("occurred_at", desc=True).execute().data or []


def create_approval_event_row(admin: Any, values: dict) -> dict:
    return admin.table("policy_approval_events").insert(values).select("*").single().execute().data


def _maybe_data(response: Any) -> dict | None:
    # maybe_single() can return no response object at all when nothing matches.
    return response.data if response is not None else None
