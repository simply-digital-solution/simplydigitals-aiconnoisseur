"""Datasets module — API router with i18n."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.datasets.schemas import DatasetProfile, DatasetRead
from app.modules.datasets.service import DatasetService
from app.shared.database import get_db
from app.shared.i18n.translator import get_translator

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/", response_model=DatasetRead, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    t = get_translator(request)
    dataset = await DatasetService(db).upload(file, name, description, current_user.id, request, t)
    return DatasetRead.model_validate(dataset)


@router.get("/", response_model=list[DatasetRead])
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DatasetRead]:
    datasets = await DatasetService(db).list_datasets(current_user.id)
    return [DatasetRead.model_validate(d) for d in datasets]


@router.get("/history", response_model=list[DatasetRead])
async def get_dataset_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DatasetRead]:
    history = await DatasetService(db).get_history(current_user.id)
    return [DatasetRead.model_validate(d) for d in history]


@router.get("/{dataset_id}", response_model=DatasetRead)
async def get_dataset(
    dataset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    t = get_translator(request)
    dataset = await DatasetService(db).get(dataset_id, current_user.id, t)
    return DatasetRead.model_validate(dataset)


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
async def get_dataset_profile(
    dataset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetProfile:
    t = get_translator(request)
    dataset = await DatasetService(db).get(dataset_id, current_user.id, t)
    return DatasetProfile.model_validate(dataset)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    t = get_translator(request)
    await DatasetService(db).delete(dataset_id, current_user.id, t)
