"""Behave environment hooks — set up a synchronous test client before each scenario."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from behave.runner import Context

# Configure for testing before any app imports
os.environ.setdefault("SECRET_KEY", "bdd-secret-key-at-least-32-chars-long!!!")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")


def before_all(ctx: Context) -> None:
    """Create a shared in-memory database and sync test client."""
    import asyncio  # noqa: PLC0415

    from app.db.session import Base, get_db  # noqa: PLC0415
    from app.main import create_app  # noqa: PLC0415
    from httpx import ASGITransport, Client  # noqa: PLC0415
    from sqlalchemy.ext.asyncio import (  # noqa: PLC0415, E501
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Synchronously create tables once before all scenarios
    async def _init() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.get_event_loop().run_until_complete(_init())

    app = create_app()

    async def _override_db():  # type: ignore[return]
        async with session_local() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_db

    # httpx sync client backed by the ASGI app
    ctx.client = Client(transport=ASGITransport(app=app), base_url="http://test")
    ctx._engine = engine  # noqa: SLF001


def after_all(ctx: Context) -> None:
    ctx.client.close()


def before_scenario(ctx: Context, scenario: object) -> None:  # noqa: ARG001
    ctx.response = None
    ctx.auth_headers = {}
    ctx.dataset_id = None
    ctx.model_id = None
