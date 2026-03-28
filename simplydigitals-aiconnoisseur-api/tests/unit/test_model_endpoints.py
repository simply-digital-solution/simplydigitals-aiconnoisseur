"""Unit tests for ML model training and inference endpoints."""

from __future__ import annotations

import csv
import io

import pytest
from httpx import AsyncClient


def _clf_csv(rows: int = 150) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["feat_a", "feat_b", "label"])
    import random
    rng = random.Random(42)
    for _ in range(rows):
        writer.writerow([
            round(rng.gauss(0, 1), 4),
            round(rng.gauss(5, 2), 4),
            rng.choice(["cat", "dog"]),
        ])
    return buf.getvalue().encode()


def _reg_csv(rows: int = 150) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["x", "y"])
    import random
    rng = random.Random(7)
    for i in range(rows):
        x = i / 10.0
        writer.writerow([round(x, 4), round(x * 2 + rng.gauss(0, 0.1), 4)])
    return buf.getvalue().encode()


async def _upload_dataset(client: AsyncClient, headers: dict, name: str, content: bytes) -> str:
    resp = await client.post(
        "/api/v1/datasets/",
        data={"name": name},
        files={"file": ("data.csv", content, "text/csv")},
        headers=headers,
    )
    return resp.json()["id"]


async def _train_model(
    client: AsyncClient,
    headers: dict,
    ds_id: str,
    algorithm: str = "classification",
) -> dict:
    feature_map = {
        "classification": {"target_column": "label", "feature_columns": ["feat_a", "feat_b"]},
        "regression": {"target_column": "y", "feature_columns": ["x"]},
    }
    resp = await client.post(
        "/api/v1/models/train",
        json={
            "name": f"{algorithm}-model",
            "dataset_id": ds_id,
            "algorithm": algorithm,
            **feature_map[algorithm],
        },
        headers=headers,
    )
    return resp.json()


class TestModelTraining:
    async def test_train_classification_returns_201(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "clf-ds", _clf_csv())
        resp = await client.post(
            "/api/v1/models/train",
            json={
                "name": "clf",
                "dataset_id": ds_id,
                "algorithm": "classification",
                "target_column": "label",
                "feature_columns": ["feat_a", "feat_b"],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "ready"
        assert "accuracy" in body["metrics"]

    async def test_train_regression_returns_r2(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "reg-ds", _reg_csv())
        resp = await client.post(
            "/api/v1/models/train",
            json={
                "name": "reg",
                "dataset_id": ds_id,
                "algorithm": "regression",
                "target_column": "y",
                "feature_columns": ["x"],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        assert "r2" in resp.json()["metrics"]

    async def test_train_unknown_dataset_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.post(
            "/api/v1/models/train",
            json={
                "name": "bad",
                "dataset_id": "nonexistent",
                "algorithm": "classification",
                "target_column": "label",
                "feature_columns": ["x"],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_train_requires_auth(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/models/train",
            json={
                "name": "x",
                "dataset_id": "y",
                "algorithm": "classification",
                "target_column": "l",
                "feature_columns": ["a"],
            },
        )
        assert resp.status_code in (401, 403)


class TestModelGetById:
    async def test_get_own_model_by_id(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "get-ds", _clf_csv())
        model = await _train_model(client, auth_headers, ds_id)
        r = await client.get(f"/api/v1/models/{model['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == model["id"]

    async def test_get_nonexistent_model_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.get("/api/v1/models/nonexistent-id", headers=auth_headers)
        assert r.status_code == 404

    async def test_get_model_requires_auth(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/models/any-id")
        assert r.status_code in (401, 403)


class TestModelListing:
    async def test_list_models_empty(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.get("/api/v1/models/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_models_returns_trained_models(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "list-ds", _clf_csv())
        await _train_model(client, auth_headers, ds_id)
        resp = await client.get("/api/v1/models/", headers=auth_headers)
        assert len(resp.json()) >= 1


class TestModelPrediction:
    async def test_predict_returns_predictions(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "pred-ds", _clf_csv())
        model = await _train_model(client, auth_headers, ds_id)
        model_id = model["id"]

        resp = await client.post(
            f"/api/v1/models/{model_id}/predict",
            json={"data": [
                {"feat_a": 0.5, "feat_b": 4.0},
                {"feat_a": -1.0, "feat_b": 6.0},
            ]},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["predictions"]) == 2
        assert body["prediction_count"] == 2
        assert all(p in ("cat", "dog") for p in body["predictions"])

    async def test_predict_nonexistent_model_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        resp = await client.post(
            "/api/v1/models/nonexistent/predict",
            json={"data": [{"x": 1}]},
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestModelDelete:
    async def test_delete_model(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload_dataset(client, auth_headers, "del-ds", _clf_csv())
        model = await _train_model(client, auth_headers, ds_id)
        model_id = model["id"]

        del_resp = await client.delete(f"/api/v1/models/{model_id}", headers=auth_headers)
        assert del_resp.status_code == 204

        get_resp = await client.get(f"/api/v1/models/{model_id}", headers=auth_headers)
        assert get_resp.status_code == 404
