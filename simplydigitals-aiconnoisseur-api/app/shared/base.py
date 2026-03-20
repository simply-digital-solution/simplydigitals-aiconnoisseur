"""Shared database base and common ORM utilities.

All module models import Base from here so Alembic can discover
every table in a single metadata scan.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import DeclarativeBase


def utcnow() -> datetime:
    return datetime.now(UTC)


def new_uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Single declarative base shared across all modules."""
    pass
