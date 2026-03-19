"""SQLAlchemy ORM models.

Each model maps to a database table.  Business logic belongs in the service
layer — models are pure data containers.
"""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────


class ModelStatus(str, enum.Enum):
    PENDING = "pending"
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"


class AlgorithmType(str, enum.Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"


# ─────────────────────────────────────────────────────────────────────────────
# User
# ─────────────────────────────────────────────────────────────────────────────


class User(Base):
    """Application user with hashed credentials."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    datasets: Mapped[list[Dataset]] = relationship("Dataset", back_populates="owner")
    ml_models: Mapped[list[MLModel]] = relationship("MLModel", back_populates="owner")


# ─────────────────────────────────────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────────────────────────────────────


class Dataset(Base):
    """Uploaded tabular dataset with stored profiling stats."""

    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    column_count: Mapped[int] = mapped_column(Integer, default=0)
    profile: Mapped[dict | None] = mapped_column(JSON)  # descriptive stats snapshot
    client_ip: Mapped[str | None] = mapped_column(String(45))  # IPv4 or IPv6, stored for audit tracing
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    owner: Mapped[User] = relationship("User", back_populates="datasets")
    ml_models: Mapped[list[MLModel]] = relationship("MLModel", back_populates="dataset")


# ─────────────────────────────────────────────────────────────────────────────
# ML Model
# ─────────────────────────────────────────────────────────────────────────────


class MLModel(Base):
    """Trained ML model artefact with metrics and hyperparameters."""

    __tablename__ = "ml_models"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    algorithm: Mapped[AlgorithmType] = mapped_column(Enum(AlgorithmType), nullable=False)
    status: Mapped[ModelStatus] = mapped_column(
        Enum(ModelStatus), default=ModelStatus.PENDING
    )
    hyperparameters: Mapped[dict | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)  # accuracy, f1, rmse, etc.
    artefact_path: Mapped[str | None] = mapped_column(String(512))
    feature_columns: Mapped[list | None] = mapped_column(JSON)
    target_column: Mapped[str | None] = mapped_column(String(255))
    training_duration_seconds: Mapped[float | None] = mapped_column(Float)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    owner: Mapped[User] = relationship("User", back_populates="ml_models")
    dataset: Mapped[Dataset] = relationship("Dataset", back_populates="ml_models")
