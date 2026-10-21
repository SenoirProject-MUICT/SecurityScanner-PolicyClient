from functools import lru_cache

from pydantic import field_validator
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
    github_app_id: str = ""
    github_app_slug: str = ""
    github_app_client_id: str = ""
    github_app_client_secret: str = ""
    github_app_private_key: str = ""
    github_webhook_secret: str = ""
    github_api_url: str = "https://api.github.com"

    model_config = SettingsConfigDict(
        env_prefix="POLICYDESK_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("github_app_private_key")
    @classmethod
    def _unescape_private_key(cls, value: str) -> str:
        # Hosting dashboards often store the PEM on one line with literal backslash-n separators.
        return value.replace("\\n", "\n").strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()
