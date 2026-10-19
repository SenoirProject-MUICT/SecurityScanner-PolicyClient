import base64
import hashlib
import logging
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
import httpx

from policydesk_api.api.dependencies import AuthenticatedUser
from policydesk_api.core.config import get_settings
from policydesk_api.core.supabase import get_admin_client
from policydesk_api.schemas.workspace import WorkspaceAction

logger = logging.getLogger("policydesk.api.workspace")


def execute_workspace_member_action(payload: WorkspaceAction, user: AuthenticatedUser) -> dict[str, Any]:
    admin = get_admin_client()
    if payload.action == "list-workspaces":
        return {"workspaces": _resolve_user_workspaces(admin, user)}
    if payload.action == "create-workspace":
        return _create_workspace(admin, user, payload.name)
    if payload.action == "join-workspace":
        return _join_workspace(admin, user, payload.code)

    workspace_id = _uuid(payload.workspace_id, "Choose a valid workspace.")
    memberships = admin.table("workspace_memberships").select("id,role,status").eq("workspace_id", workspace_id).eq("user_id", user.id).maybe_single().execute().data
    if not memberships or memberships["status"] != "active":
        raise HTTPException(status_code=403, detail="You are not an active member of this workspace.")
    is_admin = memberships["role"] == "admin"

    if payload.action == "list-members":
        rows = admin.table("workspace_memberships").select("id,workspace_id,user_id,email,display_name,role,status,is_default,created_at").eq("workspace_id", workspace_id).order("created_at").execute().data or []
        return {"members": rows, "canManage": is_admin}
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only workspace admins can manage members.")

    if payload.action == "update-workspace":
        name = (payload.name or "").strip()
        if not name or len(name) > 100:
            raise HTTPException(status_code=422, detail="Enter a workspace name up to 100 characters.")
        result = admin.table("workspaces").update({"name": name, "updated_at": datetime.now(UTC).isoformat()}).eq("id", workspace_id).select("id,name").maybe_single().execute().data
        if not result:
            raise HTTPException(status_code=404, detail="This workspace could not be found.")
        return {"workspace": {"workspaceId": result["id"], "name": result["name"]}}

    if payload.action == "delete-workspace":
        result = admin.table("workspaces").delete().eq("id", workspace_id).select("id").maybe_single().execute().data
        if not result:
            raise HTTPException(status_code=404, detail="This workspace could not be found.")
        logger.info("Workspace deleted workspace_id=%s actor_id=%s", workspace_id, user.id)
        return {"success": True}

    if payload.action == "list-join-codes":
        rows = admin.table("workspace_join_codes").select("id,workspace_id,expires_at,created_at,revoked_at,code_ciphertext").eq("workspace_id", workspace_id).order("created_at", desc=True).execute().data or []
        return {"joinCodes": [{key: row[key] for key in ("id", "workspace_id", "expires_at", "created_at", "revoked_at")} | {"code_available": bool(row.get("code_ciphertext"))} for row in rows]}
    if payload.action == "reveal-join-code":
        code_id = _uuid(payload.code_id, "Choose a valid join code.")
        row = admin.table("workspace_join_codes").select("code_ciphertext").eq("id", code_id).eq("workspace_id", workspace_id).maybe_single().execute().data
        if not row or not row.get("code_ciphertext"):
            raise HTTPException(status_code=404, detail="This code cannot be revealed. Codes created before code recovery was enabled are not recoverable.")
        try:
            code = _join_code_cipher().decrypt(row["code_ciphertext"].encode()).decode()
        except (InvalidToken, ValueError) as error:
            raise HTTPException(status_code=500, detail="This join code could not be decrypted. Check the backend encryption configuration.") from error
        return {"code": code}
    if payload.action == "create-join-code":
        if payload.expires_in_days not in (1, 7, 30):
            raise HTTPException(status_code=422, detail="Choose an expiration of 1, 7, or 30 days.")
        code = "PD-" + "-".join(secrets.token_hex(2).upper() for _ in range(6))
        expires_at = (datetime.now(UTC) + timedelta(days=payload.expires_in_days)).isoformat()
        ciphertext = _join_code_cipher().encrypt(code.encode()).decode()
        row = admin.table("workspace_join_codes").insert({"workspace_id": workspace_id, "code_hash": _hash_code(code), "code_ciphertext": ciphertext, "created_by": user.id, "expires_at": expires_at}).select("id,workspace_id,expires_at,created_at").single().execute().data
        return {"joinCode": {**row, "code": code}}
    if payload.action == "revoke-join-code":
        code_id = _uuid(payload.code_id, "Choose a valid join code.")
        result = admin.table("workspace_join_codes").update({"revoked_at": datetime.now(UTC).isoformat()}).eq("id", code_id).eq("workspace_id", workspace_id).is_("revoked_at", "null").select("id").maybe_single().execute().data
        if not result:
            raise HTTPException(status_code=404, detail="This join code is no longer active.")
        return {"success": True}
    if payload.action == "invite":
        return {"member": _invite(admin, workspace_id, user, payload.email, payload.role)}

    member_id = _uuid(payload.member_id, "Choose a valid workspace member.")
    target = admin.table("workspace_memberships").select("id,role,status,user_id,email").eq("id", member_id).eq("workspace_id", workspace_id).maybe_single().execute().data
    if not target:
        raise HTTPException(status_code=404, detail="That member is no longer in this workspace.")
    if payload.action == "set-role":
        if payload.role not in ("admin", "member"):
            raise HTTPException(status_code=422, detail="Choose either admin or member.")
        if target["role"] == "admin" and target["status"] == "active" and payload.role != "admin":
            _ensure_another_active_admin(admin, workspace_id)
        admin.table("workspace_memberships").update({"role": payload.role, "updated_at": datetime.now(UTC).isoformat()}).eq("id", member_id).execute()
        return {"success": True}
    if payload.action == "set-status":
        if payload.status not in ("active", "disabled"):
            raise HTTPException(status_code=422, detail="Choose active or disabled.")
        if target["role"] == "admin" and target["status"] == "active" and payload.status != "active":
            _ensure_another_active_admin(admin, workspace_id)
        updates = {"status": payload.status, "updated_at": datetime.now(UTC).isoformat()}
        if payload.status == "active" and target.get("email"):
            auth_user = _find_auth_user(target["email"].strip().lower())
            if auth_user:
                updates["user_id"] = auth_user["id"]
                updates["email"] = auth_user.get("email", target["email"]).strip().lower()
                updates["display_name"] = _display_name(auth_user)
        result = admin.table("workspace_memberships").update(updates).eq("id", member_id).eq("workspace_id", workspace_id).select("id,status,user_id").maybe_single().execute().data
        if not result:
            raise HTTPException(status_code=404, detail="That member is no longer in this workspace.")
        if result["status"] != payload.status:
            raise HTTPException(status_code=500, detail="The member status could not be updated. Try again.")
        logger.info(
            "Workspace member status updated membership_id=%s workspace_id=%s user_id=%s status=%s",
            member_id,
            workspace_id,
            result.get("user_id"),
            result["status"],
        )
        return {"success": True}
    if payload.action == "remove":
        if target["role"] == "admin" and target["status"] == "active":
            _ensure_another_active_admin(admin, workspace_id)
        admin.table("workspace_memberships").delete().eq("id", member_id).execute()
        return {"success": True}
    raise HTTPException(status_code=400, detail="Unknown workspace member action.")


def _create_workspace(admin: Any, user: CurrentUser, name: str | None) -> dict:
    cleaned = (name or "").strip()
    if not cleaned or len(cleaned) > 100:
        raise HTTPException(status_code=422, detail="Enter a workspace name up to 100 characters.")
    active_memberships = admin.table("workspace_memberships").select("id,is_default").eq("user_id", user.id).eq("status", "active").execute().data or []
    is_default = not any(row["is_default"] for row in active_memberships)
    workspace = admin.table("workspaces").insert({"name": cleaned, "created_by": user.id}).select("id,name").single().execute().data
    try:
        admin.table("workspace_memberships").insert({"workspace_id": workspace["id"], "user_id": user.id, "email": user.email, "display_name": user.name, "role": "admin", "status": "active", "is_default": is_default}).execute()
    except Exception:
        admin.table("workspaces").delete().eq("id", workspace["id"]).execute()
        raise
    return {"workspace": {"workspaceId": workspace["id"], "name": workspace["name"], "role": "admin", "isDefault": is_default}}


def _join_workspace(admin: Any, user: CurrentUser, code: str | None) -> dict:
    code_hash = _hash_code(code or "")
    if not code_hash:
        raise HTTPException(status_code=422, detail="Enter a valid workspace join code.")
    join_code = admin.table("workspace_join_codes").select("id,workspace_id,expires_at,revoked_at").eq("code_hash", code_hash).maybe_single().execute().data
    if not join_code or join_code["revoked_at"] or datetime.fromisoformat(join_code["expires_at"].replace("Z", "+00:00")) <= datetime.now(UTC):
        raise HTTPException(status_code=404, detail="This join code is invalid or has expired.")
    existing = admin.table("workspace_memberships").select("id,status").eq("workspace_id", join_code["workspace_id"]).eq("user_id", user.id).maybe_single().execute().data
    if existing and existing["status"] == "active":
        raise HTTPException(status_code=409, detail="You already belong to this workspace.")
    if existing and existing["status"] == "disabled":
        raise HTTPException(status_code=403, detail="Your access to this workspace is disabled. Contact an admin.")
    active = admin.table("workspace_memberships").select("id,is_default").eq("user_id", user.id).eq("status", "active").execute().data or []
    is_default = not any(row["is_default"] for row in active)
    invited = admin.table("workspace_memberships").select("id").eq("workspace_id", join_code["workspace_id"]).eq("email", user.email.lower()).eq("status", "invited").maybe_single().execute().data if user.email else None
    values = {"user_id": user.id, "email": user.email.lower(), "display_name": user.name, "status": "active", "is_default": is_default, "updated_at": datetime.now(UTC).isoformat()}
    if invited:
        admin.table("workspace_memberships").update(values).eq("id", invited["id"]).execute()
    else:
        admin.table("workspace_memberships").insert({**values, "workspace_id": join_code["workspace_id"], "role": "member"}).execute()
    return {"success": True}


def _resolve_user_workspaces(admin: Any, user: CurrentUser) -> list[dict]:
    email = user.email.strip().lower()
    # Membership emails can predate normalization. Match case-insensitively so
    # an active row can be reattached after a user's Auth account is recreated.
    pending = admin.table("workspace_memberships").select("id,workspace_id").ilike("email", email).eq("status", "invited").execute().data or []
    active = admin.table("workspace_memberships").select("id,is_default").eq("user_id", user.id).eq("status", "active").execute().data or []
    logger.info(
        "Workspace membership lookup user_id=%s email_present=%s active_by_user_id=%s invited_by_email=%s",
        user.id,
        bool(email),
        len(active),
        len(pending),
    )
    if not active and email:
        # Auth accounts can be recreated for an existing email. Reattach active
        # memberships only; a disabled row never grants access through email.
        email_active = admin.table("workspace_memberships").select("id,workspace_id,user_id,is_default").ilike("email", email).eq("status", "active").execute().data or []
        logger.info("Workspace active email matches user_id=%s count=%s", user.id, len(email_active))
        default_exists = bool(admin.table("workspace_memberships").select("id").eq("user_id", user.id).eq("status", "active").eq("is_default", True).limit(1).execute().data)
        for membership in email_active:
            conflicting = admin.table("workspace_memberships").select("id").eq("workspace_id", membership["workspace_id"]).eq("user_id", user.id).maybe_single().execute().data
            if conflicting and conflicting["id"] != membership["id"]:
                logger.warning(
                    "Could not reattach active workspace membership because another membership uses this user id user_id=%s workspace_id=%s",
                    user.id,
                    membership["workspace_id"],
                )
                continue
            if membership.get("user_id") != user.id:
                keep_default = bool(membership.get("is_default")) and not default_exists
                admin.table("workspace_memberships").update({"user_id": user.id, "display_name": user.name, "is_default": keep_default, "updated_at": datetime.now(UTC).isoformat()}).eq("id", membership["id"]).execute()
                default_exists = default_exists or keep_default
                logger.info("Reattached active workspace membership by email membership_id=%s", membership["id"])
        active = admin.table("workspace_memberships").select("id,is_default").eq("user_id", user.id).eq("status", "active").execute().data or []
    if pending:
        has_default = any(row["is_default"] for row in active)
        for index, invite in enumerate(pending):
            admin.table("workspace_memberships").update({"user_id": user.id, "status": "active", "is_default": not active and index == 0 and not has_default, "display_name": user.name, "updated_at": datetime.now(UTC).isoformat()}).eq("id", invite["id"]).execute()
    rows = admin.table("workspace_memberships").select("workspace_id,role,is_default,status").eq("user_id", user.id).eq("status", "active").order("is_default", desc=True).execute().data or []
    if not rows:
        prior = admin.table("workspace_memberships").select("status").eq("user_id", user.id).execute().data or []
        if prior:
            logger.warning(
                "No active workspaces available to user user_id=%s membership_statuses=%s",
                user.id,
                [row["status"] for row in prior],
            )
            # Listing available workspaces is account-level access. A disabled
            # membership blocks entry to that workspace, but should not block
            # the user from creating or joining a different workspace.
            return []
        return []
    if not any(row["is_default"] for row in rows):
        first = rows[0]
        admin.table("workspace_memberships").update({"is_default": True, "updated_at": datetime.now(UTC).isoformat()}).eq("workspace_id", first["workspace_id"]).eq("user_id", user.id).execute()
        first["is_default"] = True
    names = admin.table("workspaces").select("id,name").in_("id", [row["workspace_id"] for row in rows]).execute().data or []
    by_id = {row["id"]: row["name"] for row in names}
    return [{"workspaceId": row["workspace_id"], "name": by_id.get(row["workspace_id"], "Workspace"), "role": row["role"], "isDefault": row["is_default"]} for row in rows]


def _invite(admin: Any, workspace_id: str, user: CurrentUser, email_value: str | None, role: str | None) -> dict:
    email = (email_value or "").strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="Choose either admin or member.")
    duplicate = admin.table("workspace_memberships").select("id").eq("workspace_id", workspace_id).eq("email", email).maybe_single().execute().data
    if duplicate:
        raise HTTPException(status_code=409, detail="This email already belongs to the workspace.")
    auth_user = _find_auth_user(email)
    invited_id = None if auth_user else _send_invite(email)
    row = admin.table("workspace_memberships").insert({"workspace_id": workspace_id, "user_id": auth_user["id"] if auth_user else invited_id, "email": email, "display_name": _display_name(auth_user) if auth_user else email.split("@")[0], "role": role, "status": "active" if auth_user else "invited", "is_default": False}).select("*").single().execute().data
    return row


def _find_auth_user(email: str) -> dict | None:
    settings = get_settings()
    headers = {"apikey": settings.supabase_service_role_key, "Authorization": f"Bearer {settings.supabase_service_role_key}"}
    for page in range(1, 21):
        response = httpx.get(f"{settings.supabase_url}/auth/v1/admin/users", params={"page": page, "per_page": 1000}, headers=headers, timeout=15)
        response.raise_for_status()
        users = response.json().get("users", [])
        matched = next((user for user in users if (user.get("email") or "").lower() == email), None)
        if matched or len(users) < 1000:
            return matched
    return None


def _send_invite(email: str) -> str:
    settings = get_settings()
    headers = {"apikey": settings.supabase_service_role_key, "Authorization": f"Bearer {settings.supabase_service_role_key}"}
    response = httpx.post(f"{settings.supabase_url}/auth/v1/invite", params={"redirect_to": settings.app_base_url}, json={"email": email}, headers=headers, timeout=15)
    response.raise_for_status()
    return response.json()["id"]


def _display_name(user: dict | None) -> str:
    if not user:
        return ""
    metadata = user.get("user_metadata") or {}
    return str(metadata.get("full_name") or metadata.get("name") or (user.get("email") or "").split("@")[0])


def _ensure_another_active_admin(admin: Any, workspace_id: str) -> None:
    rows = admin.table("workspace_memberships").select("id", count="exact", head=True).eq("workspace_id", workspace_id).eq("role", "admin").eq("status", "active").execute()
    if (rows.count or 0) <= 1:
        raise HTTPException(status_code=409, detail="A workspace must have at least one active admin.")


def _uuid(value: str | None, message: str) -> str:
    if not value or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", value, flags=re.I):
        raise HTTPException(status_code=400, detail=message)
    return value


def _hash_code(code: str) -> str:
    normalized = re.sub(r"[^A-Z0-9]", "", code.strip().upper())
    if not re.fullmatch(r"PD[A-F0-9]{24}", normalized):
        return ""
    return hashlib.sha256(normalized.encode()).hexdigest()


def _join_code_cipher() -> Fernet:
    settings = get_settings()
    secret = settings.join_code_encryption_key or settings.supabase_service_role_key
    if not secret:
        raise HTTPException(status_code=503, detail="Join code recovery is not configured.")
    key = base64.urlsafe_b64encode(hashlib.sha256(b"policydesk-join-code-v1:" + secret.encode()).digest())
    return Fernet(key)
