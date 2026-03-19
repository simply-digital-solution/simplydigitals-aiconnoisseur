"""ML model endpoints: train, list, predict, delete."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import MessageResponse, MLModelRead, PredictRequest, PredictResponse, TrainRequest
from app.services.ml_service import MLModelService

router = APIRouter(prefix="/models", tags=["ML Models"])


@router.get("/", response_model=list[MLModelRead])
async def list_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MLModelRead]:
    svc = MLModelService(db)
    models = await svc.list_models(current_user.id)
    return [MLModelRead.model_validate(m) for m in models]


@router.post("/train", response_model=MLModelRead, status_code=status.HTTP_201_CREATED)
async def train_model(
    payload: TrainRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MLModelRead:
    """Submit a training job. Returns the model record (status=ready on success)."""
    svc = MLModelService(db)
    model = await svc.train(payload, current_user.id)
    return MLModelRead.model_validate(model)


@router.get("/{model_id}", response_model=MLModelRead)
async def get_model(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MLModelRead:
    svc = MLModelService(db)
    model = await svc.get(model_id, current_user.id)
    return MLModelRead.model_validate(model)


@router.post("/{model_id}/predict", response_model=PredictResponse)
async def predict(
    model_id: str,
    payload: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PredictResponse:
    """Run inference against a trained model."""
    svc = MLModelService(db)
    predictions = await svc.predict(model_id, current_user.id, payload.data)
    return PredictResponse(
        model_id=model_id,
        predictions=predictions,
        prediction_count=len(predictions),
    )


@router.delete("/{model_id}", response_model=MessageResponse)
async def delete_model(
    model_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    svc = MLModelService(db)
    await svc.delete(model_id, current_user.id)
    return MessageResponse(message="Model deleted successfully")
