"""Models module — ORM models.

Owns: MLModel, ModelStatus, AlgorithmType
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base import Base, new_uuid, utcnow

if TYPE_CHECKING:
    from app.modules.auth.models import User
    from app.modules.datasets.models import Dataset


class ModelStatus(enum.StrEnum):
    PENDING = "pending"
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"


class AlgorithmType(enum.StrEnum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"


class MLModel(Base):
    """Trained ML model artefact with metrics and hyperparameters."""

    __tablename__ = "ml_models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    algorithm: Mapped[AlgorithmType] = mapped_column(Enum(AlgorithmType), nullable=False)
    status: Mapped[ModelStatus] = mapped_column(Enum(ModelStatus), default=ModelStatus.PENDING)
    hyperparameters: Mapped[dict | None] = mapped_column(JSON)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    artefact_path: Mapped[str | None] = mapped_column(String(512))
    feature_columns: Mapped[list | None] = mapped_column(JSON)
    target_column: Mapped[str | None] = mapped_column(String(255))
    training_duration_seconds: Mapped[float | None] = mapped_column(Float)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id"), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    owner: Mapped[User] = relationship("User", back_populates="ml_models")
    dataset: Mapped[Dataset] = relationship("Dataset", back_populates="ml_models")
