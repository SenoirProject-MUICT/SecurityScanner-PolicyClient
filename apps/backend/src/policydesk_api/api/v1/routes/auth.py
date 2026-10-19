from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from policydesk_api.api.dependencies import CurrentUser
from policydesk_api.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])


class SignInInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignUpInput(SignInInput):
    name: str = Field(min_length=1, max_length=60)


class RefreshInput(BaseModel):
    model_config = ConfigDict(alias_generator=lambda value: "".join(part.capitalize() if index else part for index, part in enumerate(value.split("_"))), populate_by_name=True)

    refresh_token: str = Field(min_length=1)


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=60)


@router.post("/sign-in")
async def sign_in(payload: SignInInput) -> dict:
    data = await _auth_request("POST", "/token?grant_type=password", json={"email": payload.email, "password": payload.password})
    return _session(data)


@router.post("/sign-up")
async def sign_up(payload: SignUpInput) -> dict:
    data = await _auth_request("POST", "/signup", json={"email": payload.email, "password": payload.password, "data": {"full_name": payload.name.strip()}})
    user = data.get("user") or data
    identities = user.get("identities")
    if isinstance(identities, list) and not identities:
        raise HTTPException(status_code=409, detail="An account with this email may already exist. Try signing in instead.")
    if data.get("access_token"):
        return _session(data)
    return {"user": _map_user(user), "session": None}


@router.post("/refresh")
async def refresh(payload: RefreshInput) -> dict:
    data = await _auth_request("POST", "/token?grant_type=refresh_token", json={"refresh_token": payload.refresh_token})
    return _session(data)


@router.get("/me")
def get_me(user: CurrentUser) -> dict:
    return {"user": {"id": user.id, "email": user.email, "name": user.name}}


@router.patch("/me")
async def update_me(payload: ProfileInput, authorization: str = Header()) -> dict:
    token = _bearer(authorization)
    data = await _auth_request("PUT", "/user", json={"data": {"full_name": payload.name.strip()}}, access_token=token)
    return {"user": _map_user(data)}


@router.post("/sign-out", status_code=204)
async def sign_out(authorization: str = Header()) -> None:
    token = _bearer(authorization)
    await _auth_request("POST", "/logout", access_token=token)


async def _auth_request(method: str, path: str, *, json: dict | None = None, access_token: str | None = None) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Authentication is not configured on the API.")
    headers = {"apikey": settings.supabase_anon_key}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    async with httpx.AsyncClient(base_url=f"{settings.supabase_url}/auth/v1", timeout=20) as client:
        response = await client.request(method, path.lstrip("/"), json=json, headers=headers)
    try:
        data = response.json() if response.content else {}
    except ValueError:
        data = {}
    if not response.is_success:
        detail = data.get("msg") or data.get("message") or data.get("error_description") or data.get("error") or "Authentication request failed."
        raise HTTPException(status_code=response.status_code, detail=str(detail))
    return data if isinstance(data, dict) else {}


def _session(data: dict[str, Any]) -> dict:
    if not data.get("access_token") or not data.get("refresh_token"):
        raise HTTPException(status_code=401, detail="Authentication did not return a session. Check your email confirmation and try again.")
    user = data.get("user") or {}
    expires_at = data.get("expires_at")
    if not expires_at:
        expires_at = int((datetime.now(UTC) + timedelta(seconds=int(data.get("expires_in", 3600)))).timestamp())
    return {"user": _map_user(user), "session": {"accessToken": data["access_token"], "refreshToken": data["refresh_token"], "expiresAt": expires_at}}


def _map_user(user: dict) -> dict:
    metadata = user.get("user_metadata") or {}
    email = user.get("email") or ""
    return {"id": str(user.get("id", "")), "email": email, "name": metadata.get("full_name") or metadata.get("name") or email.split("@")[0] or "Policy member"}


def _bearer(authorization: str) -> str:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return authorization[7:].strip()
