"""Dataset endpoints: upload, list, profile, delete."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import Dataset, User
from app.schemas.schemas import DatasetProfile, DatasetRead, MessageResponse

router = APIRouter(prefix="/datasets", tags=["Datasets"])
settings = get_settings()

_UPLOAD_DIR = Path("./uploads")


def _get_client_ip(request: Request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For may be a comma-separated list; the first entry is the originating client
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _profile_dataframe(df: pd.DataFrame) -> dict:
    """Return a lightweight statistical profile of a DataFrame."""
    numeric = df.select_dtypes(include="number")
    profile: dict = {
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "null_counts": df.isnull().sum().to_dict(),
        "row_count": len(df),
        "column_count": len(df.columns),
    }
    if not numeric.empty:
        desc = numeric.describe().round(4).to_dict()
        profile["numeric_stats"] = desc
    return profile


@router.get("/", response_model=list[DatasetRead])
async def list_datasets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DatasetRead]:
    result = await db.execute(
        select(Dataset).where(Dataset.owner_id == current_user.id)
    )
    return [DatasetRead.model_validate(ds) for ds in result.scalars().all()]


@router.post("/", response_model=DatasetRead, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    request: Request,
    name: str = Form(..., min_length=1, max_length=255),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetRead:
    """Upload a CSV dataset file. The caller's IP address is recorded for audit tracing."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported",
        )

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{current_user.id}_{name.replace(' ', '_')}.csv"
    file_path = _UPLOAD_DIR / safe_name

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    file_path.write_bytes(content)

    try:
        df = pd.read_csv(str(file_path))
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not parse CSV: {exc}",
        ) from exc

    if len(df) > settings.MAX_DATASET_ROWS:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dataset exceeds maximum of {settings.MAX_DATASET_ROWS} rows",
        )

    profile = _profile_dataframe(df)

    client_ip = _get_client_ip(request)

    dataset = Dataset(
        name=name,
        description=description,
        file_path=str(file_path),
        row_count=len(df),
        column_count=len(df.columns),
        profile=profile,
        client_ip=client_ip,
        owner_id=current_user.id,
    )
    db.add(dataset)
    await db.flush()
    return DatasetRead.model_validate(dataset)


@router.get("/{dataset_id}", response_model=DatasetRead)
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetRead:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return DatasetRead.model_validate(dataset)


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
async def profile_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetProfile:
    """Return full statistical profile for the dataset."""
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    return DatasetProfile.model_validate(dataset)


@router.delete("/{dataset_id}", response_model=MessageResponse)
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.owner_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    await db.delete(dataset)
    return MessageResponse(message="Dataset deleted successfully")
