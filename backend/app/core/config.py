"""Centralised application configuration.

This module exposes a Pydantic-based settings object that consolidates
environment variable parsing and provides sensible defaults. Importing
``settings`` anywhere in the codebase ensures consistent configuration
usage across the app without scattering ``os.getenv`` calls.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration loaded from environment variables."""

    app_name: str = Field(default="editresume.io API", env="APP_NAME")
    environment: str = Field(default="development", env="ENVIRONMENT")
    version: str = Field(default="0.1.0", env="APP_VERSION")

    premium_mode: bool = Field(default=False, env="PREMIUM_MODE")

    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", env="OPENAI_MODEL")
    openai_max_tokens: int = Field(default=2000, env="OPENAI_MAX_TOKENS")

    database_url: Optional[str] = Field(default=None, env="DATABASE_URL")

    additional_cors_origins: Union[str, List[str]] = Field(
        default="", env="ADDITIONAL_CORS_ORIGINS"
    )

    firebase_project_id: Optional[str] = Field(default=None, env="FIREBASE_PROJECT_ID")
    firebase_service_account_json: Optional[str] = Field(
        default=None, env="FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    firebase_service_account_base64: Optional[str] = Field(
        default=None, env="FIREBASE_SERVICE_ACCOUNT_BASE64"
    )
    firebase_service_account_key_path: Optional[str] = Field(
        default=None, env="FIREBASE_SERVICE_ACCOUNT_KEY_PATH"
    )

    stripe_secret_key: Optional[str] = Field(default=None, env="STRIPE_SECRET_KEY")
    stripe_webhook_secret: Optional[str] = Field(
        default=None, env="STRIPE_WEBHOOK_SECRET"
    )
    stripe_price_id: Optional[str] = Field(default=None, env="STRIPE_PRICE_ID")
    stripe_trial_price_id: Optional[str] = Field(default=None, env="STRIPE_TRIAL_PRICE_ID")
    stripe_annual_price_id: Optional[str] = Field(default=None, env="STRIPE_ANNUAL_PRICE_ID")
    stripe_success_url: Optional[str] = Field(default=None, env="STRIPE_SUCCESS_URL")
    stripe_cancel_url: Optional[str] = Field(default=None, env="STRIPE_CANCEL_URL")
    stripe_portal_return_url: Optional[str] = Field(
        default=None, env="STRIPE_PORTAL_RETURN_URL"
    )

    linkedin_client_id: Optional[str] = Field(default=None, env="LINKEDIN_CLIENT_ID")
    linkedin_client_secret: Optional[str] = Field(
        default=None, env="LINKEDIN_CLIENT_SECRET"
    )
    linkedin_redirect_uri: Optional[str] = Field(
        default=None, env="LINKEDIN_REDIRECT_URI"
    )

    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=".env",
        extra="ignore",
    )

    @field_validator("additional_cors_origins", mode="before")
    @classmethod
    def split_cors_origins(_cls, value: str | List[str] | None):  # noqa: D401, N805
        """Split comma-separated origins into a list."""
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            if not value.strip():
                return []
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return []

    @property
    def base_allowed_origins(self) -> List[str]:
        """Default CORS origins for the application."""
        return [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://staging.editresume.io",
            "https://editresume.io",
            "https://www.editresume.io",
            "https://editresume-staging.onrender.com",
            "https://editresume-staging-d4ang4wye-hasans-projects-d7f2163d.vercel.app",
            "https://editresume-staging-git-fixuploadissue-hasans-projects-d7f2163d.vercel.app",
            "https://editresume-frontend-c943dt9jp-hasans-projects-d7f2163d.vercel.app",
        ]

    @property
    def allowed_origins(self) -> List[str]:
        """Union of default and environment-provided CORS origins."""
        merged = [str(origin) for origin in self.base_allowed_origins]
        if isinstance(self.additional_cors_origins, str):
            cors_origins = [origin.strip() for origin in self.additional_cors_origins.split(",") if origin.strip()]
        else:
            cors_origins = self.additional_cors_origins
        merged.extend(cors_origins)
        # Remove duplicates while preserving order
        seen: set[str] = set()
        unique: List[str] = []
        for origin in merged:
            if origin not in seen:
                unique.append(origin)
                seen.add(origin)
        return unique


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()


settings = get_settings()
