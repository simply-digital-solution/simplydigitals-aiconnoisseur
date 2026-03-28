"""ML pipeline: training, evaluation, and inference.

Supports classification, regression, and clustering algorithms via scikit-learn.
Models are persisted to disk using joblib.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from app.modules.models.models import AlgorithmType
from app.shared.config import get_settings
from app.shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────────────────
# Algorithm registry
# ─────────────────────────────────────────────────────────────────────────────

_CLASSIFIERS = {
    "logistic_regression": LogisticRegression,
    "gradient_boosting": GradientBoostingClassifier,
}

_REGRESSORS = {
    "linear_regression": LinearRegression,
    "gradient_boosting": GradientBoostingRegressor,
}

_CLUSTERERS = {
    "kmeans": KMeans,
}


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────


class MLPipeline:
    """Encapsulates feature prep, training, evaluation, and persistence."""

    def __init__(
        self,
        algorithm: AlgorithmType,
        hyperparameters: dict[str, Any] | None = None,
    ) -> None:
        self.algorithm = algorithm
        self.hyperparameters: dict[str, Any] = hyperparameters or {}
        self.model: Any = None
        self.scaler: StandardScaler | None = None
        self.label_encoder: LabelEncoder | None = None

    # ── Public API ───────────────────────────────────────────────────────

    def train(
        self,
        df: pd.DataFrame,
        feature_columns: list[str],
        target_column: str | None = None,
    ) -> dict[str, Any]:
        """Train the model and return evaluation metrics."""
        start = time.perf_counter()

        X = df[feature_columns].copy()
        X = self._encode_categoricals(X)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        metrics: dict[str, Any]

        if self.algorithm == AlgorithmType.CLUSTERING:
            metrics = self._train_clustering(X_scaled)
        else:
            if target_column is None:
                msg = "target_column is required for supervised learning"
                raise ValueError(msg)
            y = df[target_column].copy()
            metrics = self._train_supervised(X_scaled, y)

        metrics["training_duration_seconds"] = round(time.perf_counter() - start, 3)
        logger.info("model_trained", algorithm=self.algorithm, metrics=metrics)
        return metrics

    def predict(self, data: list[dict[str, Any]], feature_columns: list[str]) -> list[Any]:
        """Run inference on *data* rows."""
        if self.model is None or self.scaler is None:
            msg = "Model has not been trained yet"
            raise RuntimeError(msg)

        df = pd.DataFrame(data)[feature_columns]
        df = self._encode_categoricals(df)
        X_scaled = self.scaler.transform(df)
        preds = self.model.predict(X_scaled)

        if self.label_encoder is not None:
            return self.label_encoder.inverse_transform(preds).tolist()
        return preds.tolist()

    def save(self, path: str) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"model": self.model, "scaler": self.scaler, "label_encoder": self.label_encoder},
            path,
        )
        logger.info("model_saved", path=path)

    @classmethod
    def load(cls, path: str, algorithm: AlgorithmType) -> MLPipeline:
        artefact = joblib.load(path)
        pipeline = cls(algorithm)
        pipeline.model = artefact["model"]
        pipeline.scaler = artefact["scaler"]
        pipeline.label_encoder = artefact["label_encoder"]
        return pipeline

    # ── Private helpers ──────────────────────────────────────────────────

    def _train_supervised(self, X: Any, y: pd.Series) -> dict[str, Any]:  # noqa: N803
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        if self.algorithm == AlgorithmType.CLASSIFICATION:
            self.label_encoder = LabelEncoder()
            y_train_enc = self.label_encoder.fit_transform(y_train)
            y_test_enc = self.label_encoder.transform(y_test)

            algo_name = self.hyperparameters.pop("algorithm_name", "gradient_boosting")
            klass = _CLASSIFIERS.get(algo_name, GradientBoostingClassifier)
            self.model = klass(**self.hyperparameters)
            self.model.fit(X_train, y_train_enc)

            preds = self.model.predict(X_test)
            return {
                "accuracy": round(float(accuracy_score(y_test_enc, preds)), 4),
                "f1_weighted": round(
                    float(f1_score(y_test_enc, preds, average="weighted", zero_division=0)),
                    4,
                ),
            }

        # Regression
        algo_name = self.hyperparameters.pop("algorithm_name", "gradient_boosting")
        klass = _REGRESSORS.get(algo_name, GradientBoostingRegressor)
        self.model = klass(**self.hyperparameters)
        self.model.fit(X_train, y_train)

        preds = self.model.predict(X_test)
        return {
            "r2": round(float(r2_score(y_test, preds)), 4),
            "mae": round(float(mean_absolute_error(y_test, preds)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 4),
        }

    def _train_clustering(self, X: Any) -> dict[str, Any]:  # noqa: N803
        n_clusters = self.hyperparameters.get("n_clusters", 3)
        self.model = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
        self.model.fit(X)
        score = (
            float(silhouette_score(X, self.model.labels_))
            if len(set(self.model.labels_)) > 1
            else 0.0
        )
        return {"silhouette_score": round(score, 4), "n_clusters": n_clusters}

    def _encode_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        for col in df.select_dtypes(include=["object", "category"]).columns:
            df[col] = LabelEncoder().fit_transform(df[col].astype(str))
        return df.infer_objects()
