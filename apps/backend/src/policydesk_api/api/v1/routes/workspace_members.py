from typing import Any

from fastapi import APIRouter

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.schemas.workspace import WorkspaceAction
from policydesk_api.services.workspace_members import execute_workspace_member_action

router = APIRouter(prefix="/workspace-members", tags=["workspace members"])


@router.post("")
def workspace_member_action(payload: WorkspaceAction, user: CurrentUser) -> dict[str, Any]:
    return execute_workspace_member_action(payload, user)
