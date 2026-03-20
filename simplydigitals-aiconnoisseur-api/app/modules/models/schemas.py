"""Models module — Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.modules.models.models import AlgorithmType, ModelStatus


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TrainRequest(_Base):
    name: str
    dataset_id: str
    algorithm: AlgorithmType
    target_column: str
    feature_columns: list[str]
    hyperparameters: dict[str, Any] | None = None


class PredictRequest(_Base):
    data: list[dict[str, Any]]


class ModelRead(_Base):
    id: str
    name: str
    algorithm: AlgorithmType
    status: ModelStatus
    metrics: dict[str, Any] | None = None
    hyperparameters: dict[str, Any] | None = None
    feature_columns: list[str] | None = None
    target_column: str | None = None
    training_duration_seconds: float | None = None
    dataset_id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
