"""Unit tests for OAuth user creation and linking via UserService."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthProvider, User
from app.modules.auth.schemas import UserCreate
from app.modules.auth.service import OAuthProfile, UserService

_PROFILE = OAuthProfile(
    provider_id="google-sub-123",
    email="oauth@example.com",
    full_name="OAuth User",
    avatar_url="https://example.com/avatar.jpg",
)


class TestGetOrCreateOAuthUser:
    async def test_creates_new_oauth_user(self, db_session: AsyncSession) -> None:
        user = await UserService(db_session).get_or_create_oauth_user(
            _PROFILE, AuthProvider.GOOGLE
        )
        assert user.email == "oauth@example.com"
        assert user.auth_provider == AuthProvider.GOOGLE
        assert user.oauth_provider_id == "google-sub-123"
        assert user.hashed_password is None

    async def test_returns_existing_oauth_user(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        first = await svc.get_or_create_oauth_user(_PROFILE, AuthProvider.GOOGLE)
        second = await svc.get_or_create_oauth_user(_PROFILE, AuthProvider.GOOGLE)
        assert first.id == second.id

    async def test_updates_avatar_on_existing_user(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.get_or_create_oauth_user(_PROFILE, AuthProvider.GOOGLE)
        updated_profile = OAuthProfile(
            provider_id=_PROFILE.provider_id,
            email=_PROFILE.email,
            full_name=_PROFILE.full_name,
            avatar_url="https://example.com/new-avatar.jpg",
        )
        user = await svc.get_or_create_oauth_user(updated_profile, AuthProvider.GOOGLE)
        assert user.avatar_url == "https://example.com/new-avatar.jpg"

    async def test_links_existing_local_user_to_google(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        local = await svc.create(
            UserCreate(email="oauth@example.com", password="Password1!", full_name="Local")
        )
        assert local.auth_provider == AuthProvider.LOCAL

        linked = await svc.get_or_create_oauth_user(_PROFILE, AuthProvider.GOOGLE)
        assert linked.id == local.id
        assert linked.auth_provider == AuthProvider.GOOGLE
        assert linked.oauth_provider_id == "google-sub-123"

    async def test_oauth_user_has_no_password(self, db_session: AsyncSession) -> None:
        user = await UserService(db_session).get_or_create_oauth_user(
            _PROFILE, AuthProvider.GOOGLE
        )
        assert user.hashed_password is None

    async def test_oauth_user_cannot_login_with_password(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.get_or_create_oauth_user(_PROFILE, AuthProvider.GOOGLE)
        result = await svc.authenticate("oauth@example.com", "anypassword")
        assert result is None
