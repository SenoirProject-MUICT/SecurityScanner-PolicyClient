from datetime import UTC, datetime
from typing import Any


def list_policy_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policies").select("*").eq("workspace_id", workspace_id).order("updated_at", desc=True).execute().data or []


def create_policy_row(client: Any, values: dict) -> dict:
    return client.table("policies").insert(values).select("*").single().execute().data


def update_policy_row(client: Any, policy_id: str, workspace_id: str, values: dict) -> dict:
    values["updated_at"] = datetime.now(UTC).isoformat()
    return client.table("policies").update(values).eq("id", policy_id).eq("workspace_id", workspace_id).select("*").single().execute().data


def set_policy_status_row(client: Any, policy_id: str, workspace_id: str, status: str) -> dict:
    return update_policy_row(client, policy_id, workspace_id, {"status": status})


def delete_policy_row(client: Any, policy_id: str, workspace_id: str) -> None:
    client.table("policies").delete().eq("id", policy_id).eq("workspace_id", workspace_id).execute()


def list_activity_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policy_activity").select("*").eq("workspace_id", workspace_id).order("occurred_at", desc=True).execute().data or []


def create_activity_row(client: Any, workspace_id: str, owner_id: str, policy_id: str, policy_name: str, activity_type: str) -> None:
    client.table("policy_activity").insert({
        "workspace_id": workspace_id, "owner_id": owner_id, "policy_id": policy_id,
        "policy_name": policy_name, "activity_type": activity_type,
    }).execute()
