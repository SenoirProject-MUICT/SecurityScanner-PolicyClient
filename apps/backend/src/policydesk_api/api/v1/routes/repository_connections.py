from fastapi import APIRouter, Query

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.services import repository_connections as service

router = APIRouter(prefix="/repository-connections", tags=["repository connections"])


@router.get("")
def list_connections(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_connections(user, workspace_id)


@router.post("/{connection_id}/sync")
def sync_connection(connection_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.sync_connection(user, workspace_id, connection_id)


@router.delete("/{connection_id}", status_code=204)
def disconnect(connection_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> None:
    service.disconnect(user, workspace_id, connection_id)
