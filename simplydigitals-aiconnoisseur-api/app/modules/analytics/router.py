"""Analytics module — API router with i18n."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Depends, Request

from app.modules.analytics.schemas import (
    AnalyticsRequest,
    CorrelationResponse,
    ForecastRequest,
    ForecastResponse,
)
from app.modules.analytics.service import AnalyticsService
from app.modules.auth.dependencies import get_current_user
from app.shared.database import get_db
from app.shared.i18n.translator import get_translator

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.modules.auth.models import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/describe", response_model=dict[str, Any])
async def describe(
    payload: AnalyticsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    t = get_translator(request)
    return await AnalyticsService(db).describe(
        payload.dataset_id, current_user.id, payload.columns, t
    )


@router.post("/correlation", response_model=CorrelationResponse)
async def correlation(
    payload: AnalyticsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CorrelationResponse:
    t = get_translator(request)
    matrix = await AnalyticsService(db).correlation(
        payload.dataset_id, current_user.id, payload.columns, t
    )
    return CorrelationResponse(dataset_id=payload.dataset_id, correlation_matrix=matrix)


@router.post("/forecast", response_model=ForecastResponse)
async def forecast(
    payload: ForecastRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ForecastResponse:
    t = get_translator(request)
    result = await AnalyticsService(db).forecast(
        payload.dataset_id,
        current_user.id,
        payload.date_column,
        payload.value_column,
        payload.periods,
        t,
    )
    return ForecastResponse(
        dataset_id=payload.dataset_id,
        periods=payload.periods,
        forecast=result,
    )
