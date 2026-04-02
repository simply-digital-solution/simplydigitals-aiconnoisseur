"""Datasets module — Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DatasetCreate(_Base):
    name: str
    description: str | None = None


class DatasetRead(_Base):
    id: str
    name: str
    description: str | None = None
    row_count: int
    column_count: int
    client_ip: str | None = None
    s3_key: str | None = None
    owner_id: str
    created_at: datetime


class DatasetProfile(_Base):
    id: str
    name: str
    row_count: int
    column_count: int
    client_ip: str | None = None
    profile: dict[str, Any] | None = None
