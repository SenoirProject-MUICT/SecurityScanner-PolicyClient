from fastapi import APIRouter, Query

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.schemas.policy import (
    ActivityInput,
    ApprovalDecisionInput,
    PolicyInput,
    PolicyStatusInput,
)
from policydesk_api.services import policies as service

router = APIRouter(prefix="/policies", tags=["policies"])


@router.get("")
def list_policies(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_policies(user, workspace_id)


@router.post("", status_code=201)
def create_policy(payload: PolicyInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.create_policy(user, workspace_id, payload)


@router.put("/{policy_id}")
def update_policy(policy_id: str, payload: PolicyInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.update_policy(user, workspace_id, policy_id, payload)


@router.patch("/{policy_id}/status")
def set_policy_status(policy_id: str, payload: PolicyStatusInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.set_policy_status(user, workspace_id, policy_id, payload.status)


@router.post("/{policy_id}/submit")
def submit_policy(policy_id: str, payload: ApprovalDecisionInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.submit_policy(user, workspace_id, policy_id, payload.note)


@router.post("/{policy_id}/approve")
def approve_policy(policy_id: str, payload: ApprovalDecisionInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.approve_policy(user, workspace_id, policy_id, payload.note)


@router.post("/{policy_id}/reject")
def reject_policy(policy_id: str, payload: ApprovalDecisionInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.reject_policy(user, workspace_id, policy_id, payload.note)


@router.get("/{policy_id}/history")
def list_policy_history(policy_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_policy_history(user, workspace_id, policy_id)


@router.delete("/{policy_id}", status_code=204)
def delete_policy(policy_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> None:
    service.delete_policy(user, workspace_id, policy_id)


@router.get("/activity")
def list_policy_activity(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_policy_activity(user, workspace_id)


@router.post("/activity", status_code=204)
def record_policy_activity(payload: ActivityInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> None:
    service.record_policy_activity(user, workspace_id, payload.policy_id, payload.policy_name, payload.activity_type)
