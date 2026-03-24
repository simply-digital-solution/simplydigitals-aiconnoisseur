"""Models module — API router with i18n."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.models.schemas import ModelRead, PredictRequest, TrainRequest
from app.modules.models.service import MLModelService
from app.shared.database import get_db
from app.shared.i18n.translator import get_translator

router = APIRouter(prefix="/models", tags=["Models"])


@router.post("/train", response_model=ModelRead, status_code=status.HTTP_201_CREATED)
async def train_model(
    payload: TrainRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ModelRead:
    t = get_translator(request)
    model = await MLModelService(db).train(payload, current_user.id, t)
    return ModelRead.model_validate(model)


@router.get("/", response_model=list[ModelRead])
async def list_models(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ModelRead]:
    models = await MLModelService(db).list_models(current_user.id)
    return [ModelRead.model_validate(m) for m in models]


@router.get("/{model_id}", response_model=ModelRead)
async def get_model(
    model_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ModelRead:
    t = get_translator(request)
    model = await MLModelService(db).get(model_id, current_user.id, t)
    return ModelRead.model_validate(model)


@router.post("/{model_id}/predict")
async def predict(
    model_id: str,
    payload: PredictRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    t = get_translator(request)
    predictions = await MLModelService(db).predict(model_id, current_user.id, payload.data, t)
    return {"predictions": predictions, "prediction_count": len(predictions)}


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    t = get_translator(request)
    await MLModelService(db).delete(model_id, current_user.id, t)
