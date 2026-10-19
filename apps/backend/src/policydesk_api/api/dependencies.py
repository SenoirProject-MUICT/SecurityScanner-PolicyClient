import logging
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from supabase import Client

from policydesk_api.core.supabase import create_user_client

logger = logging.getLogger("policydesk.api.auth")


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    name: str
    access_token: str
    supabase: Client


def get_current_user(request: Request, authorization: Annotated[str | None, Header()] = None) -> AuthenticatedUser:
    request_id = getattr(request.state, "request_id", "unknown")
    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("Authentication rejected request_id=%s reason=missing_bearer_token", request_id)
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    access_token = authorization[7:].strip()
    try:
        client = create_user_client(access_token)
        response = client.auth.get_user(access_token)
        user = response.user
    except Exception as error:
        logger.warning(
            "Authentication rejected request_id=%s reason=token_validation_failed error_type=%s upstream_status=%s upstream_code=%s",
            request_id,
            type(error).__name__,
            getattr(error, "status", None),
            getattr(error, "code", None),
        )
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.") from error
    if not user:
        logger.warning("Authentication rejected request_id=%s reason=no_user_for_token", request_id)
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.")
    metadata = user.user_metadata or {}
    name = metadata.get("full_name") or metadata.get("name") or (user.email or "").split("@")[0]
    return AuthenticatedUser(
        id=str(user.id),
        email=user.email or "",
        name=str(name or "Policy member"),
        access_token=access_token,
        supabase=client,
    )


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
