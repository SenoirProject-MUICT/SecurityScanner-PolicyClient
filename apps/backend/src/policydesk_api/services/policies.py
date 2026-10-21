from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.core.supabase import get_admin_client
from policydesk_api.repositories import policies as repository
from policydesk_api.services.workspace_access import require_admin

# Changing any of these after review invalidates the approval decision.
MATERIAL_FIELDS = ("name", "description", "labels", "effective_from", "effective_until")
APPROVED_STATUSES = ("active", "inactive")


def list_policies(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    return [_map_policy(row) for row in repository.list_policy_rows(user.supabase, workspace_id)]


def create_policy(user: AuthenticatedUser, workspace_id: str, payload: Any) -> dict:
    values = payload.model_dump(by_alias=False)
    values.update({"workspace_id": workspace_id, "owner_id": user.id, "created_by": user.name, "version": 1})
    if values["status"] == "pending":
        values.update({"submitted_by": user.id, "submitted_at": _now()})
    policy = repository.create_policy_row(user.supabase, values)
    if policy["status"] == "pending":
        _record_event(user, policy, "submitted")
    return _map_policy(policy)


def update_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str, payload: Any) -> dict:
    existing = _get_policy(user, workspace_id, policy_id)
    values = payload.model_dump(by_alias=False)
    requested_status = values.pop("status")
    material = _material_values(existing) != _material_values(values)
    if existing["status"] in APPROVED_STATUSES and not material:
        # Nothing reviewed has changed, so the existing approval still stands.
        return _map_policy(existing)

    updates = dict(values, status=requested_status)
    if material:
        updates["version"] = existing["version"] + 1
    is_new_submission = requested_status == "pending" and (existing["status"] != "pending" or material)
    if is_new_submission:
        updates.update({"submitted_by": user.id, "submitted_at": _now()})
    elif requested_status == "draft":
        updates.update({"submitted_by": None, "submitted_at": None})
    policy = repository.update_policy_row(user.supabase, policy_id, workspace_id, updates)

    if material and existing["status"] in APPROVED_STATUSES:
        _record_event(user, policy, "reopened", "Edited after approval; the policy no longer applies until it is approved again.")
    if is_new_submission:
        _record_event(user, policy, "submitted")
    return _map_policy(policy)


def submit_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str, note: str) -> dict:
    existing = _get_policy(user, workspace_id, policy_id)
    if existing["status"] not in ("draft", "rejected"):
        raise HTTPException(status_code=409, detail="Only draft or rejected policies can be submitted for approval.")
    policy = _transition(user, existing, ["draft", "rejected"], {"status": "pending", "submitted_by": user.id, "submitted_at": _now()})
    _record_event(user, policy, "submitted", note)
    return _map_policy(policy)


def approve_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str, note: str) -> dict:
    _require_admin(user, workspace_id)
    existing = _get_policy(user, workspace_id, policy_id)
    if existing["status"] != "pending":
        raise HTTPException(status_code=409, detail="Only policies waiting for approval can be approved.")
    # Separation of duties: a different admin approves, unless the submitter is the only admin.
    self_approved = existing.get("submitted_by") == user.id
    if self_approved and repository.count_active_admins(get_admin_client(), workspace_id) > 1:
        raise HTTPException(status_code=403, detail="Another admin must approve a policy you submitted.")
    policy = _transition(user, existing, ["pending"], {"status": "active"})
    _record_event(user, policy, "approved", note, self_approved=self_approved)
    return _map_policy(policy)


def reject_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str, note: str) -> dict:
    _require_admin(user, workspace_id)
    reason = note.strip()
    if not reason:
        raise HTTPException(status_code=422, detail="Explain why the policy is rejected so the author can fix it.")
    existing = _get_policy(user, workspace_id, policy_id)
    if existing["status"] != "pending":
        raise HTTPException(status_code=409, detail="Only policies waiting for approval can be rejected.")
    policy = _transition(user, existing, ["pending"], {"status": "rejected"})
    _record_event(user, policy, "rejected", reason)
    return _map_policy(policy)


def set_policy_status(user: AuthenticatedUser, workspace_id: str, policy_id: str, status: str) -> dict:
    _require_admin(user, workspace_id)
    existing = _get_policy(user, workspace_id, policy_id)
    if existing["status"] not in APPROVED_STATUSES:
        raise HTTPException(status_code=409, detail="Only approved policies can be turned on or off.")
    if existing["status"] == status:
        return _map_policy(existing)
    policy = _transition(user, existing, list(APPROVED_STATUSES), {"status": status})
    _record_event(user, policy, "reactivated" if status == "active" else "deactivated")
    return _map_policy(policy)


def delete_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str) -> None:
    repository.delete_policy_row(user.supabase, policy_id, workspace_id)


def list_policy_history(user: AuthenticatedUser, workspace_id: str, policy_id: str) -> list[dict]:
    return [{
        "id": row["id"], "workspaceId": row["workspace_id"], "policyId": row["policy_id"],
        "policyName": row["policy_name"], "policyVersion": row["policy_version"], "action": row["action"],
        "actorId": row.get("actor_id") or "", "actorName": row.get("actor_name") or "",
        "note": row.get("note") or "", "selfApproved": bool(row.get("self_approved")), "occurredAt": row["occurred_at"],
    } for row in repository.list_approval_event_rows(user.supabase, workspace_id, policy_id)]


def list_policy_activity(user: AuthenticatedUser, workspace_id: str) -> list[dict]:
    return [{
        "id": row["id"], "workspaceId": row["workspace_id"], "policyId": row["policy_id"],
        "policyName": row["policy_name"], "type": row["activity_type"], "occurredAt": row["occurred_at"],
    } for row in repository.list_activity_rows(user.supabase, workspace_id)]


def record_policy_activity(user: AuthenticatedUser, workspace_id: str, policy_id: str, policy_name: str, activity_type: str) -> None:
    repository.create_activity_row(user.supabase, workspace_id, user.id, policy_id, policy_name, activity_type)


def _get_policy(user: AuthenticatedUser, workspace_id: str, policy_id: str) -> dict:
    policy = repository.get_policy_row(user.supabase, policy_id, workspace_id)
    if not policy:
        raise HTTPException(status_code=404, detail="This policy could not be found. Refresh the page and try again.")
    return policy


def _transition(user: AuthenticatedUser, existing: dict, from_statuses: list[str], values: dict) -> dict:
    policy = repository.transition_policy_row(user.supabase, existing["id"], existing["workspace_id"], from_statuses, existing["version"], values)
    if not policy:
        raise HTTPException(status_code=409, detail="This policy changed while you were working on it. Refresh to see the latest version.")
    return policy


def _require_admin(user: AuthenticatedUser, workspace_id: str) -> None:
    require_admin(user.supabase, workspace_id, user.id, "Only workspace admins can approve, reject, or turn policies on and off.")


def _record_event(user: AuthenticatedUser, policy: dict, action: str, note: str = "", self_approved: bool = False) -> None:
    repository.create_approval_event_row(get_admin_client(), {
        "workspace_id": policy["workspace_id"], "policy_id": policy["id"], "policy_name": policy["name"],
        "policy_version": policy["version"], "action": action, "actor_id": user.id, "actor_name": user.name,
        "note": note.strip(), "self_approved": self_approved,
    })


def _material_values(values: dict) -> tuple:
    # Normalize empty values so "" and None, or reordered labels, don't count as edits.
    return tuple(sorted(values.get(field) or []) if field == "labels" else values.get(field) or None for field in MATERIAL_FIELDS)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _map_policy(row: dict) -> dict:
    return {
        "id": row["id"], "workspaceId": row["workspace_id"], "name": row["name"],
        "description": row.get("description") or "", "labels": row.get("labels") or [],
        "status": row["status"], "effectiveFrom": row.get("effective_from"),
        "effectiveUntil": row.get("effective_until"), "ownerId": row.get("owner_id") or "",
        "createdBy": row.get("created_by") or "", "createdAt": row["created_at"],
        "updatedAt": row["updated_at"], "version": row.get("version") or 1,
        "submittedBy": row.get("submitted_by"), "submittedAt": row.get("submitted_at"),
    }
