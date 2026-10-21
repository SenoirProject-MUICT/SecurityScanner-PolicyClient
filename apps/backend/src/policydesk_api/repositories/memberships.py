from typing import Any


def get_membership_row(client: Any, workspace_id: str, user_id: str) -> dict | None:
    response = client.table("workspace_memberships").select("role,status").eq("workspace_id", workspace_id).eq("user_id", user_id).maybe_single().execute()
    # maybe_single() can return no response object at all when nothing matches.
    return response.data if response is not None else None
