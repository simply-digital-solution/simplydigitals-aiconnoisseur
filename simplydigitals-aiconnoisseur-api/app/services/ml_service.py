"""ML Model service — orchestrates training jobs and inference."""

from __future__ import annotations

import os
from typing import Any

from fastapi import HTTPException, status
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.ml.pipeline import MLPipeline
from app.models.models import AlgorithmType, Dataset, MLModel, ModelStatus
from app.schemas.schemas import TrainRequest

logger = get_logger(__name__)
settings = get_settings()


class MLModelService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_models(self, owner_id: str) -> list[MLModel]:
        result = await self.db.execute(
            select(MLModel).where(MLModel.owner_id == owner_id)
        )
        return list(result.scalars().all())

    async def get(self, model_id: str, owner_id: str) -> MLModel:
        result = await self.db.execute(
            select(MLModel).where(MLModel.id == model_id, MLModel.owner_id == owner_id)
        )
        model = result.scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
        return model

    async def train(self, payload: TrainRequest, owner_id: str) -> MLModel:
        # Verify dataset ownership
        ds_result = await self.db.execute(
            select(Dataset).where(Dataset.id == payload.dataset_id, Dataset.owner_id == owner_id)
        )
        dataset = ds_result.scalar_one_or_none()
        if not dataset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

        ml_model = MLModel(
            name=payload.name,
            algorithm=payload.algorithm,
            status=ModelStatus.TRAINING,
            hyperparameters=payload.hyperparameters,
            feature_columns=payload.feature_columns,
            target_column=payload.target_column,
            dataset_id=payload.dataset_id,
            owner_id=owner_id,
        )
        self.db.add(ml_model)
        await self.db.flush()

        try:
            df = pd.read_csv(dataset.file_path)
            pipeline = MLPipeline(payload.algorithm, payload.hyperparameters or {})
            metrics = pipeline.train(df, payload.feature_columns, payload.target_column)

            artefact_path = os.path.join(settings.MODEL_ARTEFACT_DIR, f"{ml_model.id}.joblib")
            pipeline.save(artefact_path)

            ml_model.status = ModelStatus.READY
            ml_model.metrics = {
                k: v for k, v in metrics.items() if k != "training_duration_seconds"
            }
            ml_model.training_duration_seconds = metrics.get("training_duration_seconds")
            ml_model.artefact_path = artefact_path

        except Exception as exc:
            ml_model.status = ModelStatus.FAILED
            logger.error("training_failed", model_id=ml_model.id, error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Training failed: {exc}",
            ) from exc

        return ml_model

    async def predict(self, model_id: str, owner_id: str, data: list[dict[str, Any]]) -> list[Any]:
        ml_model = await self.get(model_id, owner_id)
        if ml_model.status != ModelStatus.READY:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Model is not ready")
        if not ml_model.artefact_path or not ml_model.feature_columns:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Model artefact missing",
            )

        pipeline = MLPipeline.load(ml_model.artefact_path, ml_model.algorithm)
        return pipeline.predict(data, ml_model.feature_columns)

    async def delete(self, model_id: str, owner_id: str) -> None:
        ml_model = await self.get(model_id, owner_id)
        if ml_model.artefact_path and os.path.exists(ml_model.artefact_path):
            os.remove(ml_model.artefact_path)
        await self.db.delete(ml_model)
