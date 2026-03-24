"""Analytics module — Pydantic schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AnalyticsRequest(_Base):
    dataset_id: str
    columns: list[str] | None = None


class CorrelationResponse(_Base):
    dataset_id: str
    correlation_matrix: dict[str, Any]


class ForecastRequest(_Base):
    dataset_id: str
    date_column: str
    value_column: str
    periods: int = Field(default=30, ge=1)


class ForecastResponse(_Base):
    dataset_id: str
    periods: int
    forecast: list[dict[str, Any]]
