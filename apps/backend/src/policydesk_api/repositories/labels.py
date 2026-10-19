from datetime import UTC, datetime
from typing import Any


def list_label_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policy_labels").select("*").eq("workspace_id", workspace_id).order("name").execute().data or []


def create_label_row(client: Any, workspace_id: str, owner_id: str, created_by: str, name: str) -> dict:
    return client.table("policy_labels").insert({
        "name": name, "workspace_id": workspace_id, "owner_id": owner_id, "created_by": created_by,
    }).select("*").single().execute().data


def get_label_row(client: Any, label_id: str, workspace_id: str) -> dict:
    return client.table("policy_labels").select("id,name").eq("id", label_id).eq("workspace_id", workspace_id).single().execute().data


def list_policy_label_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("policies").select("id,labels").eq("workspace_id", workspace_id).execute().data or []


def replace_policy_label(client: Any, policy_id: str, workspace_id: str, labels: list[str]) -> None:
    client.table("policies").update({"labels": labels, "updated_at": datetime.now(UTC).isoformat()}).eq("id", policy_id).eq("workspace_id", workspace_id).execute()


def update_label_row(client: Any, label_id: str, workspace_id: str, name: str) -> dict:
    return client.table("policy_labels").update({"name": name}).eq("id", label_id).eq("workspace_id", workspace_id).select("*").single().execute().data


def delete_label_row(client: Any, label_id: str, workspace_id: str) -> None:
    client.table("policy_labels").delete().eq("id", label_id).eq("workspace_id", workspace_id).execute()
