"""Datasets module — ORM models.

Owns: Dataset
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base import Base, new_uuid, utcnow

if TYPE_CHECKING:
    from app.modules.auth.models import User
    from app.modules.models.models import MLModel


class Dataset(Base):
    """Uploaded tabular dataset with profiling stats."""

    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    profile: Mapped[dict | None] = mapped_column(JSON)
    client_ip: Mapped[str | None] = mapped_column(String(45))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped[User] = relationship("User", back_populates="datasets")
    ml_models: Mapped[list[MLModel]] = relationship("MLModel", back_populates="dataset")
