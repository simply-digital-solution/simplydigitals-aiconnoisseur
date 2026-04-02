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
from app.shared import s3_service
from app.shared.config import get_settings
from app.shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

_HISTORY_LIMIT = 5


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
            profile[col].update(
                {
                    "mean": float(desc.get("mean", 0)),
                    "std": float(desc.get("std", 0)),
                    "min": float(desc.get("min", 0)),
                    "max": float(desc.get("max", 0)),
                    "median": float(series.median()),
                }
            )
    return profile


_noop = lambda k, **kw: k  # noqa: E731


class DatasetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── internal helpers ────────────────────────────────────────────────────

    async def _enforce_history_limit(self, owner_id: str) -> None:
        """Delete the oldest dataset(s) when the user already has _HISTORY_LIMIT files."""
        result = await self.db.execute(
            select(Dataset).where(Dataset.owner_id == owner_id).order_by(Dataset.created_at.asc())
        )
        all_datasets = list(result.scalars().all())
        while len(all_datasets) >= _HISTORY_LIMIT:
            oldest = all_datasets.pop(0)
            await self._remove_files(oldest)
            await self.db.delete(oldest)
            logger.info("dataset_evicted", dataset_id=oldest.id, owner_id=owner_id)

    async def _remove_files(self, dataset: Dataset) -> None:
        """Remove local file and S3 object for a dataset."""
        if dataset.s3_key and s3_service.is_enabled():
            s3_service.delete_object(dataset.s3_key)
        if dataset.file_path and os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)

    # ── public API ──────────────────────────────────────────────────────────

    async def upload(
        self,
        file: UploadFile,
        name: str,
        description: str | None,
        owner_id: str,
        request: Request,
        t: Callable[..., str] = _noop,
    ) -> Dataset:
        if file.content_type not in ("text/csv", "application/csv", "application/vnd.ms-excel"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=t("datasets.invalid_type"),
            )
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=t("datasets.empty_file"),
            )

        # Parse before persisting so we can reject bad CSVs cheaply
        try:
            import io

            df = pd.read_csv(io.BytesIO(content))
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=t("datasets.parse_error", detail=str(exc)),
            ) from exc

        # Enforce 5-file-per-user limit before inserting
        await self._enforce_history_limit(owner_id)

        file_id = str(uuid.uuid4())
        s3_key: str | None = None
        file_path: str

        if s3_service.is_enabled():
            s3_key = f"datasets/{owner_id}/{file_id}.csv"
            s3_service.upload_csv(s3_key, content)
            # Store a placeholder path — Lambda /tmp is used for any local cache
            file_path = os.path.join(os.environ.get("TMPDIR", "/tmp"), "datasets", f"{file_id}.csv")  # nosec B108
        else:
            os.makedirs(settings.MODEL_ARTEFACT_DIR, exist_ok=True)
            file_path = os.path.join(settings.MODEL_ARTEFACT_DIR, f"{file_id}.csv")
            with open(file_path, "wb") as f:
                f.write(content)

        dataset = Dataset(
            name=name,
            description=description,
            file_path=file_path,
            s3_key=s3_key,
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

    async def get_history(self, owner_id: str) -> list[Dataset]:
        """Return the last _HISTORY_LIMIT datasets for the user, newest first."""
        result = await self.db.execute(
            select(Dataset)
            .where(Dataset.owner_id == owner_id)
            .order_by(Dataset.created_at.desc())
            .limit(_HISTORY_LIMIT)
        )
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=t("datasets.not_found"),
            )
        return dataset

    async def delete(
        self,
        dataset_id: str,
        owner_id: str,
        t: Callable[..., str] = _noop,
    ) -> None:
        dataset = await self.get(dataset_id, owner_id, t)
        await self._remove_files(dataset)
        await self.db.delete(dataset)
        logger.info("dataset_deleted", dataset_id=dataset_id)
