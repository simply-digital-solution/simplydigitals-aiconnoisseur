"""Analytics module — AnalyticsService.

Stateless computation service. Loads datasets from the DB and runs
pandas / scikit-learn analytics. No ORM writes — read-only module.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from fastapi import HTTPException, status
from sklearn.linear_model import LinearRegression
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.datasets.models import Dataset
from app.shared.logging import get_logger

logger = get_logger(__name__)


class AnalyticsService:

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _load_df(self, dataset_id: str, owner_id: str) -> pd.DataFrame:
        """Load a dataset CSV the current user owns."""
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id)
        )
        ds = result.scalar_one_or_none()
        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )
        return pd.read_csv(ds.file_path)

    async def describe(
        self,
        dataset_id: str,
        owner_id: str,
        columns: list[str] | None,
    ) -> dict[str, Any]:
        """Descriptive statistics for selected (or all numeric) columns."""
        df = await self._load_df(dataset_id, owner_id)
        cols = columns or df.select_dtypes(include="number").columns.tolist()
        return df[cols].describe().round(4).to_dict()

    async def correlation(
        self,
        dataset_id: str,
        owner_id: str,
        columns: list[str] | None,
    ) -> dict[str, Any]:
        """Pearson correlation matrix for numeric columns."""
        df = await self._load_df(dataset_id, owner_id)
        cols = columns or df.select_dtypes(include="number").columns.tolist()
        return df[cols].corr().round(4).to_dict()

    async def forecast(
        self,
        dataset_id: str,
        owner_id: str,
        date_column: str,
        value_column: str,
        periods: int,
    ) -> list[dict[str, Any]]:
        """Linear trend extrapolation forecast."""
        df = await self._load_df(dataset_id, owner_id)
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        df["_t"] = range(len(df))

        model = LinearRegression()
        model.fit(df[["_t"]], df[value_column])

        last_date = df[date_column].iloc[-1]
        future_t = np.arange(len(df), len(df) + periods).reshape(-1, 1)
        future_dates = pd.date_range(start=last_date, periods=periods + 1, freq="D")[1:]
        future_values = model.predict(future_t)

        return [
            {"date": str(d.date()), "predicted_value": round(float(v), 4)}
            for d, v in zip(future_dates, future_values)
        ]
