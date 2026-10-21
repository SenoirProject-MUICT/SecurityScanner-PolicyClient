import json

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import RedirectResponse

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.core.config import get_settings
from policydesk_api.integrations.github import verify_webhook_signature
from policydesk_api.services import github_webhooks, repository_connections, repository_sync

router = APIRouter(prefix="/integrations/github", tags=["github integration"])


@router.get("/install-url")
def get_install_url(user: CurrentUser, workspace_id: str = Query(min_length=1)) -> dict:
    return repository_connections.github_install_url(user, workspace_id)


@router.get("/callback", response_class=RedirectResponse, status_code=302)
def installation_callback(
    background_tasks: BackgroundTasks,
    installation_id: str | None = None,
    state: str | None = None,
    code: str | None = None,
) -> RedirectResponse:
    url, connection = repository_connections.complete_github_installation(installation_id, state, code)
    if connection:
        # Redirect right away; the repositories page shows per-repository sync progress.
        background_tasks.add_task(repository_sync.sync_connection, connection)
    return RedirectResponse(url, status_code=302)


@router.post("/webhook", status_code=202)
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
    x_github_delivery: str | None = Header(default=None),
) -> dict:
    body = await request.body()
    if not verify_webhook_signature(get_settings().github_webhook_secret, body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    if not x_github_event or not x_github_delivery:
        raise HTTPException(status_code=400, detail="Missing GitHub event or delivery headers.")
    try:
        payload = json.loads(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="The webhook body is not valid JSON.") from error
    status, delivery = await run_in_threadpool(github_webhooks.record_delivery, x_github_delivery, x_github_event, payload)
    if delivery:
        background_tasks.add_task(github_webhooks.process_delivery, delivery, payload)
    return {"status": status}
