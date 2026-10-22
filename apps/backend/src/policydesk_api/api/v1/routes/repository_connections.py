from fastapi import APIRouter, BackgroundTasks, Query

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.schemas.repository import LinkedRepositoriesInput
from policydesk_api.services import repository_connections as service
from policydesk_api.services import repository_sync

router = APIRouter(prefix="/repository-connections", tags=["repository connections"])


@router.get("")
def list_connections(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> list[dict]:
    return service.list_connections(user, workspace_id)


@router.post("/{connection_id}/sync")
def sync_connection(connection_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return service.sync_connection(user, workspace_id, connection_id)


@router.put("/{connection_id}/linked-repositories")
def set_linked_repositories(
    connection_id: str, payload: LinkedRepositoriesInput, user: CurrentUser, background_tasks: BackgroundTasks,
    workspace_id: str = Query(min_length=1),
) -> dict:
    connection, newly_linked = service.set_linked_repositories(user, workspace_id, connection_id, payload.repository_ids)
    if newly_linked:
        # Respond right away; newly linked repositories show "Syncing" until their pull requests are imported.
        background_tasks.add_task(repository_sync.sync_repositories, connection, newly_linked)
    return service.list_connection(user, workspace_id, connection_id)


@router.delete("/{connection_id}", status_code=204)
def disconnect(connection_id: str, user: CurrentUser, workspace_id: str = Query(min_length=1)) -> None:
    service.disconnect(user, workspace_id, connection_id)
