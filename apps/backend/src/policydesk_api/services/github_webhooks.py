import logging
from collections.abc import Callable
from typing import Any, Literal

from policydesk_api.core.supabase import get_admin_client
from policydesk_api.integrations.github import GitHubError
from policydesk_api.repositories import repository_integrations as repository
from policydesk_api.services import repository_sync

logger = logging.getLogger("policydesk.api.github_webhooks")

Outcome = Literal["processed", "ignored"]
DeliveryStatus = Literal["accepted", "duplicate", "ignored"]


def _handle_pull_request(admin: Any, payload: dict) -> Outcome:
    connection = _connection_for(admin, payload)
    repository_row = repository.get_repository_by_provider_id(admin, (payload.get("repository") or {}).get("id") or 0)
    number = (payload.get("pull_request") or {}).get("number") or payload.get("number")
    if not connection or connection["status"] != "active" or not repository_row or repository_row["connection_id"] != connection["id"] or not repository_row["is_linked"] or not number:
        return "ignored"
    # Event payloads can be stale or partial, so the pull request is always re-read from the API.
    repository_sync.refresh_pull_request(connection, repository_row, int(number))
    return "processed"


def _handle_installation(admin: Any, payload: dict) -> Outcome:
    connection = _connection_for(admin, payload)
    if not connection:
        return "ignored"
    if payload["action"] == "deleted":
        repository.delete_connection_row(admin, connection["id"], connection["workspace_id"])
    else:
        repository.update_connection_status(admin, connection["id"], connection["workspace_id"], "suspended" if payload["action"] == "suspend" else "active")
    return "processed"


def _handle_installation_repositories(admin: Any, payload: dict) -> Outcome:
    connection = _connection_for(admin, payload)
    if not connection or connection["status"] != "active":
        return "ignored"
    repository_sync.sync_connection(connection)
    return "processed"


HANDLERS: dict[str, tuple[frozenset[str], Callable[[Any, dict], Outcome]]] = {
    "pull_request": (frozenset({"opened", "reopened", "synchronize", "closed", "ready_for_review", "converted_to_draft", "edited"}), _handle_pull_request),
    "installation": (frozenset({"deleted", "suspend", "unsuspend"}), _handle_installation),
    "installation_repositories": (frozenset({"added", "removed"}), _handle_installation_repositories),
}


def record_delivery(delivery_id: str, event: str, payload: dict) -> tuple[DeliveryStatus, dict | None]:
    """Store the delivery for replay protection. Returns the row to process in the background, if any."""
    admin = get_admin_client()
    action = payload.get("action")
    delivery = repository.create_delivery_row(admin, delivery_id, event, action)
    if delivery is None:
        return "duplicate", None
    actions, _ = HANDLERS.get(event, (frozenset(), None))
    if action not in actions:
        repository.finish_delivery_row(admin, delivery["id"], "ignored")
        return "ignored", None
    return "accepted", delivery


def process_delivery(delivery: dict, payload: dict) -> None:
    admin = get_admin_client()
    _, handler = HANDLERS[delivery["event"]]
    try:
        outcome = handler(admin, payload)
    except GitHubError as error:
        repository.finish_delivery_row(admin, delivery["id"], "failed", str(error))
    except Exception:
        logger.exception("GitHub webhook processing crashed delivery_id=%s event=%s", delivery["delivery_id"], delivery["event"])
        repository.finish_delivery_row(admin, delivery["id"], "failed", "Processing stopped because of an unexpected error.")
    else:
        repository.finish_delivery_row(admin, delivery["id"], outcome)


def _connection_for(admin: Any, payload: dict) -> dict | None:
    installation_id = (payload.get("installation") or {}).get("id")
    return repository.get_connection_by_installation(admin, int(installation_id)) if installation_id else None
