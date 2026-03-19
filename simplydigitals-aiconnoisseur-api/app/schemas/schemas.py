"""Pydantic v2 schemas for request validation and response serialisation.

Schemas are intentionally separate from ORM models to allow independent
evolution of the API contract and database schema.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import AlgorithmType, ModelStatus


# ─────────────────────────────────────────────────────────────────────────────
# Shared base
# ─────────────────────────────────────────────────────────────────────────────


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ─────────────────────────────────────────────────────────────────────────────
# Auth / User
# ─────────────────────────────────────────────────────────────────────────────


class UserCreate(_Base):
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)
    full_name: str = Field(min_length=1, max_length=255)


class UserRead(_Base):
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime


class TokenResponse(_Base):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(_Base):
    email: EmailStr
    password: str


class RefreshRequest(_Base):
    refresh_token: str


# ─────────────────────────────────────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────────────────────────────────────


class DatasetCreate(_Base):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class DatasetRead(_Base):
    id: str
    name: str
    description: str | None
    row_count: int
    column_count: int
    client_ip: str | None
    owner_id: str
    created_at: datetime


class DatasetProfile(_Base):
    id: str
    name: str
    row_count: int
    column_count: int
    client_ip: str | None
    profile: dict[str, Any] | None


# ─────────────────────────────────────────────────────────────────────────────
# ML Model
# ─────────────────────────────────────────────────────────────────────────────


class TrainRequest(_Base):
    name: str = Field(min_length=1, max_length=255)
    dataset_id: str
    algorithm: AlgorithmType
    target_column: str
    feature_columns: list[str] = Field(min_length=1)
    hyperparameters: dict[str, Any] | None = None


class MLModelRead(_Base):
    id: str
    name: str
    algorithm: AlgorithmType
    status: ModelStatus
    metrics: dict[str, Any] | None
    hyperparameters: dict[str, Any] | None
    feature_columns: list[str] | None
    target_column: str | None
    training_duration_seconds: float | None
    dataset_id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class PredictRequest(_Base):
    data: list[dict[str, Any]] = Field(min_length=1, description="List of feature rows")


class PredictResponse(_Base):
    model_id: str
    predictions: list[Any]
    prediction_count: int


# ─────────────────────────────────────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────────────────────────────────────


class AnalyticsRequest(_Base):
    dataset_id: str
    columns: list[str] | None = None


class CorrelationResponse(_Base):
    dataset_id: str
    correlation_matrix: dict[str, dict[str, float]]


class ForecastRequest(_Base):
    dataset_id: str
    date_column: str
    value_column: str
    periods: int = Field(default=7, ge=1, le=365)


class ForecastResponse(_Base):
    dataset_id: str
    periods: int
    forecast: list[dict[str, Any]]


# ─────────────────────────────────────────────────────────────────────────────
# Common
# ─────────────────────────────────────────────────────────────────────────────


class MessageResponse(_Base):
    message: str


class ErrorResponse(_Base):
    detail: str
    error_code: str | None = None
