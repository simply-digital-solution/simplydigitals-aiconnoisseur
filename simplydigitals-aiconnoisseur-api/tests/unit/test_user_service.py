"""Unit tests for UserService."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from app.schemas.schemas import UserCreate
from app.services.user_service import UserService
from fastapi import HTTPException

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


class TestUserService:
    async def test_create_user_stores_hashed_password(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        user = await svc.create(
            UserCreate(email="a@b.com", password="Password123!", full_name="Alice")
        )
        assert user.hashed_password != "Password123!"
        assert user.email == "a@b.com"

    async def test_create_duplicate_email_raises_409(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        payload = UserCreate(email="dup@b.com", password="Password123!", full_name="Bob")
        await svc.create(payload)
        with pytest.raises(HTTPException) as exc_info:
            await svc.create(payload)
        assert exc_info.value.status_code == 409

    async def test_authenticate_correct_credentials(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.create(UserCreate(email="c@b.com", password="Password123!", full_name="Carol"))
        user = await svc.authenticate("c@b.com", "Password123!")
        assert user is not None
        assert user.email == "c@b.com"

    async def test_authenticate_wrong_password_returns_none(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.create(UserCreate(email="d@b.com", password="Password123!", full_name="Dan"))
        result = await svc.authenticate("d@b.com", "WrongPass!")
        assert result is None

    async def test_authenticate_unknown_email_returns_none(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        result = await svc.authenticate("ghost@b.com", "Password123!")
        assert result is None

    async def test_get_by_id_returns_user(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        created = await svc.create(
            UserCreate(email="e@b.com", password="Password123!", full_name="Eve")
        )
        found = await svc.get_by_id(created.id)
        assert found is not None
        assert found.id == created.id

    async def test_get_by_id_unknown_returns_none(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        result = await svc.get_by_id("nonexistent-id")
        assert result is None
