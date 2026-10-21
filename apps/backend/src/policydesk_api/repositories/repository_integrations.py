from datetime import UTC, datetime
from typing import Any

PROVIDER = "github"


def get_connection_row(client: Any, connection_id: str, workspace_id: str) -> dict | None:
    return _maybe_data(client.table("repository_connections").select("*").eq("id", connection_id).eq("workspace_id", workspace_id).maybe_single().execute())


def get_connection_by_installation(admin: Any, installation_id: int) -> dict | None:
    return _maybe_data(admin.table("repository_connections").select("*").eq("provider", PROVIDER).eq("installation_id", installation_id).maybe_single().execute())


def list_connection_rows(client: Any, workspace_id: str) -> list[dict]:
    return client.table("repository_connections").select("*").eq("workspace_id", workspace_id).order("created_at").execute().data or []


def list_active_connection_rows(admin: Any) -> list[dict]:
    return admin.table("repository_connections").select("*").eq("provider", PROVIDER).eq("status", "active").execute().data or []


def upsert_connection_row(admin: Any, values: dict) -> dict:
    values = dict(values, provider=PROVIDER, updated_at=_now())
    return admin.table("repository_connections").upsert(values, on_conflict="provider,installation_id").execute().data[0]


def update_connection_status(admin: Any, connection_id: str, workspace_id: str, status: str) -> None:
    admin.table("repository_connections").update({"status": status, "updated_at": _now()}).eq("id", connection_id).eq("workspace_id", workspace_id).execute()


def delete_connection_row(admin: Any, connection_id: str, workspace_id: str) -> bool:
    return bool(admin.table("repository_connections").delete().eq("id", connection_id).eq("workspace_id", workspace_id).execute().data)


def list_repository_rows(client: Any, workspace_id: str, connection_id: str | None = None) -> list[dict]:
    query = client.table("repositories").select("*").eq("workspace_id", workspace_id)
    if connection_id:
        query = query.eq("connection_id", connection_id)
    return query.order("full_name").execute().data or []


def get_repository_by_provider_id(admin: Any, provider_repository_id: int) -> dict | None:
    return _maybe_data(admin.table("repositories").select("*").eq("provider", PROVIDER).eq("provider_repository_id", provider_repository_id).maybe_single().execute())


def upsert_repository_rows(admin: Any, rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    rows = [dict(row, provider=PROVIDER, updated_at=_now()) for row in rows]
    return admin.table("repositories").upsert(rows, on_conflict="provider,provider_repository_id").execute().data or []


def delete_repositories_except(admin: Any, connection_id: str, workspace_id: str, keep_provider_ids: list[int]) -> None:
    query = admin.table("repositories").delete().eq("connection_id", connection_id).eq("workspace_id", workspace_id)
    if keep_provider_ids:
        query = query.not_.in_("provider_repository_id", keep_provider_ids)
    query.execute()


def update_repository_row(admin: Any, repository_id: str, workspace_id: str, values: dict) -> None:
    admin.table("repositories").update(dict(values, updated_at=_now())).eq("id", repository_id).eq("workspace_id", workspace_id).execute()


def list_open_request_repository_ids(client: Any, workspace_id: str) -> list[str]:
    rows = client.table("merge_requests").select("repository_id").eq("workspace_id", workspace_id).eq("state", "open").execute().data or []
    return [row["repository_id"] for row in rows]


def list_open_request_rows(admin: Any, repository_id: str, workspace_id: str) -> list[dict]:
    return admin.table("merge_requests").select("provider_request_id,number").eq("repository_id", repository_id).eq("workspace_id", workspace_id).eq("state", "open").execute().data or []


def upsert_request_row(admin: Any, values: dict) -> dict:
    values = dict(values, provider=PROVIDER, last_synced_at=_now())
    return admin.table("merge_requests").upsert(values, on_conflict="provider,repository_id,provider_request_id").execute().data[0]


def replace_request_file_rows(admin: Any, merge_request_id: str, workspace_id: str, rows: list[dict]) -> None:
    admin.table("merge_request_files").delete().eq("merge_request_id", merge_request_id).eq("workspace_id", workspace_id).execute()
    if rows:
        admin.table("merge_request_files").insert([dict(row, merge_request_id=merge_request_id, workspace_id=workspace_id) for row in rows]).execute()


def list_review_request_rows(client: Any, workspace_id: str, repository_id: str | None, state: str | None) -> list[dict]:
    query = client.table("merge_requests").select("*,repositories(full_name)").eq("workspace_id", workspace_id)
    if repository_id:
        query = query.eq("repository_id", repository_id)
    if state:
        query = query.eq("state", state)
    return query.order("provider_updated_at", desc=True).execute().data or []


def get_review_request_row(client: Any, request_id: str, workspace_id: str) -> dict | None:
    return _maybe_data(client.table("merge_requests").select("*,repositories(full_name)").eq("id", request_id).eq("workspace_id", workspace_id).maybe_single().execute())


def list_request_file_rows(client: Any, request_id: str, workspace_id: str) -> list[dict]:
    return client.table("merge_request_files").select("*").eq("merge_request_id", request_id).eq("workspace_id", workspace_id).order("filename").execute().data or []


def create_delivery_row(admin: Any, delivery_id: str, event: str, action: str | None) -> dict | None:
    """Record a webhook delivery, or return None when this delivery ID was already received."""
    rows = admin.table("provider_webhook_deliveries").upsert(
        {"provider": PROVIDER, "delivery_id": delivery_id, "event": event, "action": action},
        on_conflict="provider,delivery_id", ignore_duplicates=True,
    ).execute().data
    return rows[0] if rows else None


def finish_delivery_row(admin: Any, delivery_row_id: str, outcome: str, error: str | None = None) -> None:
    admin.table("provider_webhook_deliveries").update({"outcome": outcome, "error": error, "processed_at": _now()}).eq("id", delivery_row_id).execute()


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _maybe_data(response: Any) -> dict | None:
    # maybe_single() can return no response object at all when nothing matches.
    return response.data if response is not None else None
