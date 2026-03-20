"""Analytics module — API router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.schemas import (
    AnalyticsRequest,
    CorrelationResponse,
    ForecastRequest,
    ForecastResponse,
)
from app.modules.analytics.service import AnalyticsService
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.shared.database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/describe", response_model=dict[str, Any])
async def describe(
    payload: AnalyticsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Descriptive statistics for selected columns."""
    return await AnalyticsService(db).describe(
        payload.dataset_id, current_user.id, payload.columns
    )


@router.post("/correlation", response_model=CorrelationResponse)
async def correlation(
    payload: AnalyticsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CorrelationResponse:
    """Pearson correlation matrix for numeric columns."""
    matrix = await AnalyticsService(db).correlation(
        payload.dataset_id, current_user.id, payload.columns
    )
    return CorrelationResponse(dataset_id=payload.dataset_id, correlation_matrix=matrix)


@router.post("/forecast", response_model=ForecastResponse)
async def forecast(
    payload: ForecastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ForecastResponse:
    """Linear trend extrapolation forecast."""
    result = await AnalyticsService(db).forecast(
        payload.dataset_id,
        current_user.id,
        payload.date_column,
        payload.value_column,
        payload.periods,
    )
    return ForecastResponse(
        dataset_id=payload.dataset_id,
        periods=payload.periods,
        forecast=result,
    )
