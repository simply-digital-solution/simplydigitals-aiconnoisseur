"""Auth module — UserService with i18n support."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.modules.auth.models import AuthProvider, User
from app.shared.security import hash_password, verify_password

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.modules.auth.schemas import UserCreate


class OAuthProfile:
    def __init__(
        self,
        provider_id: str,
        email: str,
        full_name: str,
        avatar_url: str | None = None,
    ) -> None:
        self.provider_id = provider_id
        self.email = email
        self.full_name = full_name
        self.avatar_url = avatar_url


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, payload: UserCreate, t: Callable[..., str] = lambda k, **kw: k) -> User:
        if await self.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=t("auth.email_already_registered"),
            )
        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
            auth_provider=AuthProvider.LOCAL,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.get_by_email(email)
        if not user:
            return None
        if user.auth_provider != AuthProvider.LOCAL or not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def get_or_create_oauth_user(self, profile: OAuthProfile, provider: AuthProvider) -> User:
        result = await self.db.execute(
            select(User).where(
                User.auth_provider == provider,
                User.oauth_provider_id == profile.provider_id,
            )
        )
        user = result.scalar_one_or_none()
        if user:
            user.avatar_url = profile.avatar_url
            return user
        user = await self.get_by_email(profile.email)
        if user:
            user.auth_provider = provider
            user.oauth_provider_id = profile.provider_id
            user.avatar_url = profile.avatar_url or user.avatar_url
            return user
        user = User(
            email=profile.email,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
            auth_provider=provider,
            oauth_provider_id=profile.provider_id,
            hashed_password=None,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
