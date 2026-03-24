"""Analytics endpoints: descriptive stats, correlation, forecast."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.models import Dataset, User
from app.schemas.schemas import (
    AnalyticsRequest,
    CorrelationResponse,
    ForecastRequest,
    ForecastResponse,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


async def _load_dataset(dataset_id: str, owner_id: str, db: AsyncSession) -> pd.DataFrame:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id)
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return pd.read_csv(ds.file_path)


@router.post("/describe", response_model=dict[str, Any])
async def describe(
    payload: AnalyticsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return descriptive statistics for selected columns."""
    df = await _load_dataset(payload.dataset_id, current_user.id, db)
    cols = payload.columns or df.select_dtypes(include="number").columns.tolist()
    return df[cols].describe().round(4).to_dict()


@router.post("/correlation", response_model=CorrelationResponse)
async def correlation(
    payload: AnalyticsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CorrelationResponse:
    """Return Pearson correlation matrix for numeric columns."""
    df = await _load_dataset(payload.dataset_id, current_user.id, db)
    cols = payload.columns or df.select_dtypes(include="number").columns.tolist()
    matrix = df[cols].corr().round(4).to_dict()
    return CorrelationResponse(dataset_id=payload.dataset_id, correlation_matrix=matrix)


@router.post("/forecast", response_model=ForecastResponse)
async def forecast(
    payload: ForecastRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ForecastResponse:
    """Simple time-series forecasting using linear trend extrapolation."""
    df = await _load_dataset(payload.dataset_id, current_user.id, db)

    df[payload.date_column] = pd.to_datetime(df[payload.date_column])
    df = df.sort_values(payload.date_column)
    df["_t"] = range(len(df))

    from sklearn.linear_model import LinearRegression  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    model = LinearRegression()
    model.fit(df[["_t"]], df[payload.value_column])

    last_date = df[payload.date_column].iloc[-1]
    future_t = np.arange(len(df), len(df) + payload.periods).reshape(-1, 1)
    future_dates = pd.date_range(start=last_date, periods=payload.periods + 1, freq="D")[1:]
    future_values = model.predict(future_t)

    forecast_list = [
        {"date": str(d.date()), "predicted_value": round(float(v), 4)}
        for d, v in zip(future_dates, future_values, strict=False)
    ]

    return ForecastResponse(
        dataset_id=payload.dataset_id,
        periods=payload.periods,
        forecast=forecast_list,
    )
