"""Datasets module — DatasetService with i18n."""

from __future__ import annotations

import os
import uuid
from collections.abc import Callable
from typing import Any

import pandas as pd
from fastapi import HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.datasets.models import Dataset
from app.shared.config import get_settings
from app.shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    profile: dict[str, Any] = {}
    for col in df.columns:
        series = df[col]
        profile[col] = {
            "dtype": str(series.dtype),
            "count": int(series.count()),
            "null_count": int(series.isnull().sum()),
            "unique_count": int(series.nunique()),
        }
        if pd.api.types.is_numeric_dtype(series):
            desc = series.describe()
            profile[col].update({
                "mean": float(desc.get("mean", 0)),
                "std": float(desc.get("std", 0)),
                "min": float(desc.get("min", 0)),
                "max": float(desc.get("max", 0)),
                "median": float(series.median()),
            })
    return profile


_noop = lambda k, **kw: k  # noqa: E731


class DatasetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upload(
        self,
        file: UploadFile,
        name: str,
        description: str | None,
        owner_id: str,
        request: Request,
        t: Callable[..., str] = _noop,
    ) -> Dataset:
        os.makedirs(settings.MODEL_ARTEFACT_DIR, exist_ok=True)
        file_path = os.path.join(settings.MODEL_ARTEFACT_DIR, f"{uuid.uuid4()}.csv")
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        try:
            df = pd.read_csv(file_path)
        except Exception as exc:
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=t("datasets.parse_error", detail=str(exc)),
            ) from exc
        dataset = Dataset(
            name=name,
            description=description,
            file_path=file_path,
            row_count=len(df),
            column_count=len(df.columns),
            profile=_profile_dataframe(df),
            client_ip=_get_client_ip(request),
            owner_id=owner_id,
        )
        self.db.add(dataset)
        await self.db.flush()
        logger.info("dataset_uploaded", dataset_id=dataset.id, rows=dataset.row_count)
        return dataset

    async def list_datasets(self, owner_id: str) -> list[Dataset]:
        result = await self.db.execute(select(Dataset).where(Dataset.owner_id == owner_id))
        return list(result.scalars().all())

    async def get(
        self,
        dataset_id: str,
        owner_id: str,
        t: Callable[..., str] = _noop,
    ) -> Dataset:
        result = await self.db.execute(
            select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == owner_id)
        )
        dataset = result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("datasets.not_found"))
        return dataset

    async def delete(
        self,
        dataset_id: str,
        owner_id: str,
        t: Callable[..., str] = _noop,
    ) -> None:
        dataset = await self.get(dataset_id, owner_id, t)
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
        await self.db.delete(dataset)
        logger.info("dataset_deleted", dataset_id=dataset_id)
