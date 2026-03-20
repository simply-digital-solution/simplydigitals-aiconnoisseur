"""Application configuration loaded from environment variables.

Uses Pydantic Settings for type-safe, validated configuration.
Never hard-code secrets — always use environment variables or AWS Secrets Manager.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "ML Analytics API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "testing", "production"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── API ────────────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_HOSTS: list[AnyHttpUrl | str] = ["*"]

    # ── Security ───────────────────────────────────────────────────────────
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./mlapi_dev.db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # ── Rate Limiting ──────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    # ── ML Artefacts ───────────────────────────────────────────────────────
    MODEL_ARTEFACT_DIR: str = "./artefacts/models"
    MAX_DATASET_ROWS: int = 500_000

    # ── OAuth providers ────────────────────────────────────────────────────────
    # Google — create at console.cloud.google.com
    GOOGLE_CLIENT_ID: str = ""

    # Facebook — create at developers.facebook.com
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""

    # ── AWS (optional — only needed for cloud deployments) ─────────────────
    AWS_REGION: str = "ap-southeast-1"
    S3_BUCKET_NAME: str = ""

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            msg = "SECRET_KEY must be at least 32 characters"
            raise ValueError(msg)
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance.  Import this everywhere."""
    return Settings()
