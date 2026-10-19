from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Policy Desk API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173"]
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    join_code_encryption_key: str = ""
    app_base_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_prefix="POLICYDESK_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
