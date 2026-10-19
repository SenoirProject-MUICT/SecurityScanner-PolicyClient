from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.services import labels as service

router = APIRouter(prefix="/labels", tags=["labels"])


class LabelInput(BaseModel):
    name: str = Field(min_length=1, max_length=60)


@router.get("")
def list_labels(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_labels(user, workspace_id)


@router.post("", status_code=201)
def create_label(payload: LabelInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.create_label(user, workspace_id, payload.name)


@router.patch("/{label_id}")
def update_label(label_id: str, payload: LabelInput, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.update_label(user, workspace_id, label_id, payload.name)


@router.delete("/{label_id}", status_code=204)
def delete_label(label_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> None:
    service.delete_label(user, workspace_id, label_id)
