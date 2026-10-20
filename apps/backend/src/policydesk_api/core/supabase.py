from functools import lru_cache

from policydesk_api.core.config import get_settings
from supabase import Client, ClientOptions, create_client


def create_user_client(access_token: str) -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase URL and anon key are required by the API.")
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(auto_refresh_token=False, persist_session=False),
    )
    client.postgrest.auth(access_token)
    return client


@lru_cache
def get_admin_client() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase URL and service role key are required for workspace administration.")
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=ClientOptions(auto_refresh_token=False, persist_session=False),
    )
