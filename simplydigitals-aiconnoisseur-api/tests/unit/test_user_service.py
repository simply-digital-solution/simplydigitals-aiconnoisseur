"""Unit tests for UserService."""
from __future__ import annotations

import pytest
from app.modules.auth.schemas import UserCreate
from app.modules.auth.service import UserService
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

_PW = "Password1!"


class TestUserService:
    async def test_create_user_stores_hashed_password(self, db_session: AsyncSession) -> None:
        user = await UserService(db_session).create(
            UserCreate(email="a@b.com", password=_PW, full_name="Alice"))
        assert user.hashed_password != _PW

    async def test_create_duplicate_email_raises_409(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        p = UserCreate(email="dup@b.com", password=_PW, full_name="Bob")
        await svc.create(p)
        with pytest.raises(HTTPException) as exc:
            await svc.create(p)
        assert exc.value.status_code == 409

    async def test_authenticate_correct_credentials(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.create(UserCreate(email="c@b.com", password=_PW, full_name="Carol"))
        user = await svc.authenticate("c@b.com", _PW)
        assert user is not None

    async def test_authenticate_wrong_password_returns_none(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        await svc.create(UserCreate(email="d@b.com", password=_PW, full_name="Dan"))
        assert await svc.authenticate("d@b.com", "WrongPass!") is None

    async def test_authenticate_unknown_email_returns_none(self, db_session: AsyncSession) -> None:
        assert await UserService(db_session).authenticate("ghost@b.com", _PW) is None

    async def test_get_by_id_returns_user(self, db_session: AsyncSession) -> None:
        svc = UserService(db_session)
        created = await svc.create(UserCreate(email="e@b.com", password=_PW, full_name="Eve"))
        found = await svc.get_by_id(created.id)
        assert found is not None and found.id == created.id

    async def test_get_by_id_unknown_returns_none(self, db_session: AsyncSession) -> None:
        assert await UserService(db_session).get_by_id("nonexistent") is None
