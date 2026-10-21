from typing import Literal

from fastapi import APIRouter, Query

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.services import review_requests as service

router = APIRouter(prefix="/review-requests", tags=["review requests"])


@router.get("")
def list_review_requests(
    user: CurrentUser,
    workspace_id: str = Query(min_length=1),
    repository_id: str | None = None,
    state: Literal["open", "closed", "merged", "all"] = "open",
) -> list[dict]:
    return service.list_review_requests(user, workspace_id, repository_id, state)


@router.get("/{request_id}")
def get_review_request(request_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.get_review_request(user, workspace_id, request_id)
