from typing import Any

from fastapi import HTTPException

from policydesk_api.repositories.memberships import get_membership_row


def is_active_admin(client: Any, workspace_id: str, user_id: str) -> bool:
    membership = get_membership_row(client, workspace_id, user_id)
    return bool(membership and membership["status"] == "active" and membership["role"] == "admin")


def require_admin(client: Any, workspace_id: str, user_id: str, detail: str) -> None:
    membership = get_membership_row(client, workspace_id, user_id)
    if not membership or membership["status"] != "active":
        raise HTTPException(status_code=403, detail="You are not an active member of this workspace.")
    if membership["role"] != "admin":
        raise HTTPException(status_code=403, detail=detail)
