"""Auth module — Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserCreate(_Base):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    full_name: str = Field(min_length=1, max_length=255)


class UserRead(_Base):
    id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    auth_provider: str = "local"
    is_active: bool
    created_at: datetime


class LoginRequest(_Base):
    email: EmailStr
    password: str


class RefreshRequest(_Base):
    refresh_token: str


class TokenResponse(_Base):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class GoogleLoginRequest(_Base):
    """Google ID token from the Google Sign-In SDK."""
    id_token: str


class FacebookLoginRequest(_Base):
    """Facebook user access token from the Facebook Login SDK."""
    access_token: str
