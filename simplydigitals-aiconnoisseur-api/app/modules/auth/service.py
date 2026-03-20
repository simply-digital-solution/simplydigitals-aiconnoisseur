"""Auth module — UserService.

Handles local credential auth and OAuth social login.
No imports from other modules — auth is self-contained.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthProvider, User
from app.modules.auth.schemas import UserCreate
from app.shared.security import hash_password, verify_password


class OAuthProfile:
    """Normalised profile returned by any OAuth provider."""
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
    """All user-related business logic lives here — routers stay thin."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Local auth ────────────────────────────────────────────────────────────

    async def create(self, payload: UserCreate) -> User:
        if await self.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
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
            return None  # Social account — must use OAuth flow
        if not verify_password(password, user.hashed_password):
            return None
        return user

    # ── OAuth auth ────────────────────────────────────────────────────────────

    async def get_or_create_oauth_user(
        self,
        profile: OAuthProfile,
        provider: AuthProvider,
    ) -> User:
        """Find by provider ID → fall back to email → create new."""
        # 1. Match by provider + provider_id (most reliable)
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

        # 2. Match by email (link existing local account)
        user = await self.get_by_email(profile.email)
        if user:
            user.auth_provider = provider
            user.oauth_provider_id = profile.provider_id
            user.avatar_url = profile.avatar_url or user.avatar_url
            return user

        # 3. Create new OAuth user
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

    # ── Lookups ───────────────────────────────────────────────────────────────

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
