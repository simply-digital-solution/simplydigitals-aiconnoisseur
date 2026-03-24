"""Unit tests for the ML training pipeline."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.ml.pipeline import MLPipeline
from app.models.models import AlgorithmType


def _make_classification_df(n: int = 200) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    return pd.DataFrame(
        {
            "feature_a": rng.normal(0, 1, n),
            "feature_b": rng.normal(5, 2, n),
            "label": rng.choice(["cat", "dog"], n),
        }
    )


def _make_regression_df(n: int = 200) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    x = rng.normal(0, 1, n)
    return pd.DataFrame({"x": x, "y": 3 * x + rng.normal(0, 0.1, n)})


def _make_clustering_df(n: int = 150) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    return pd.DataFrame(
        {
            "a": np.concatenate([
                rng.normal(0, 0.5, n // 3),
                rng.normal(5, 0.5, n // 3),
                rng.normal(10, 0.5, n // 3),
            ]),
            "b": np.concatenate([
                rng.normal(0, 0.5, n // 3),
                rng.normal(5, 0.5, n // 3),
                rng.normal(10, 0.5, n // 3),
            ]),
        }
    )


class TestClassificationPipeline:
    def test_train_returns_accuracy_and_f1(self) -> None:
        df = _make_classification_df()
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        metrics = pipeline.train(df, ["feature_a", "feature_b"], "label")
        assert "accuracy" in metrics
        assert "f1_weighted" in metrics
        assert 0.0 <= metrics["accuracy"] <= 1.0

    def test_predict_returns_correct_count(self) -> None:
        df = _make_classification_df()
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        pipeline.train(df, ["feature_a", "feature_b"], "label")
        preds = pipeline.predict(
            [{"feature_a": 0.5, "feature_b": 4.0}, {"feature_a": -1.0, "feature_b": 6.0}],
            ["feature_a", "feature_b"],
        )
        assert len(preds) == 2

    def test_predict_before_train_raises(self) -> None:
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        with pytest.raises(RuntimeError, match="not been trained"):
            pipeline.predict([{"x": 1}], ["x"])

    def test_metrics_contain_training_duration(self) -> None:
        df = _make_classification_df()
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        metrics = pipeline.train(df, ["feature_a", "feature_b"], "label")
        assert "training_duration_seconds" in metrics
        assert metrics["training_duration_seconds"] >= 0


class TestRegressionPipeline:
    def test_train_returns_r2_mae_rmse(self) -> None:
        df = _make_regression_df()
        pipeline = MLPipeline(AlgorithmType.REGRESSION)
        metrics = pipeline.train(df, ["x"], "y")
        assert "r2" in metrics
        assert "mae" in metrics
        assert "rmse" in metrics

    def test_r2_is_high_for_linear_data(self) -> None:
        df = _make_regression_df(500)
        pipeline = MLPipeline(AlgorithmType.REGRESSION)
        metrics = pipeline.train(df, ["x"], "y")
        assert metrics["r2"] > 0.90


class TestClusteringPipeline:
    def test_train_returns_silhouette(self) -> None:
        df = _make_clustering_df()
        pipeline = MLPipeline(AlgorithmType.CLUSTERING, {"n_clusters": 3})
        metrics = pipeline.train(df, ["a", "b"])
        assert "silhouette_score" in metrics
        assert "n_clusters" in metrics
        assert metrics["n_clusters"] == 3

    def test_clustering_requires_no_target(self) -> None:
        df = _make_clustering_df()
        pipeline = MLPipeline(AlgorithmType.CLUSTERING, {"n_clusters": 2})
        metrics = pipeline.train(df, ["a", "b"])  # no target_column
        assert metrics["n_clusters"] == 2

    def test_supervised_without_target_raises(self) -> None:
        df = _make_classification_df()
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        with pytest.raises(ValueError, match="target_column"):
            pipeline.train(df, ["feature_a", "feature_b"])


class TestModelPersistence:
    def test_save_and_load_roundtrip(self, tmp_path: Path) -> None:
        df = _make_classification_df()
        pipeline = MLPipeline(AlgorithmType.CLASSIFICATION)
        pipeline.train(df, ["feature_a", "feature_b"], "label")

        path = str(tmp_path / "model.joblib")
        pipeline.save(path)

        loaded = MLPipeline.load(path, AlgorithmType.CLASSIFICATION)
        preds = loaded.predict([{"feature_a": 0.1, "feature_b": 5.0}], ["feature_a", "feature_b"])
        assert len(preds) == 1
        assert preds[0] in ("cat", "dog")
