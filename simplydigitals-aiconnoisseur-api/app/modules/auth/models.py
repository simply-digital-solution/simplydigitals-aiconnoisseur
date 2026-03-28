"""Auth module — ORM models.

Owns: User, AuthProvider
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base import Base, new_uuid, utcnow


class AuthProvider(enum.StrEnum):
    LOCAL = "local"
    GOOGLE = "google"
    FACEBOOK = "facebook"


class User(Base):
    """Application user — local credentials and OAuth social login."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, values_callable=lambda x: [e.value for e in x]),
        default=AuthProvider.LOCAL,
        nullable=False,
    )
    oauth_provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relationships owned by other modules — use string refs to avoid circular imports
    datasets: Mapped[list] = relationship("Dataset", back_populates="owner")
    ml_models: Mapped[list] = relationship("MLModel", back_populates="owner")
