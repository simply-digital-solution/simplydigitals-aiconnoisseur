"""Cross-user data isolation tests.

Verifies that a user cannot access, modify, or delete another user's
datasets or models — a critical security requirement.
"""

from __future__ import annotations

import csv
import io

import pytest
from httpx import AsyncClient

_PW = "StrongPass1!"


def _csv_bytes() -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["a", "b", "label"])
    import random
    rng = random.Random(0)
    for _ in range(50):
        writer.writerow([rng.gauss(0, 1), rng.gauss(1, 1), rng.choice(["x", "y"])])
    return buf.getvalue().encode()


async def _register_and_login(client: AsyncClient, email: str) -> dict[str, str]:
    await client.post("/api/v1/auth/register",
        json={"email": email, "password": _PW, "full_name": "User"})
    r = await client.post("/api/v1/auth/login",
        json={"email": email, "password": _PW})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _upload(client: AsyncClient, headers: dict) -> str:
    r = await client.post("/api/v1/datasets/",
        data={"name": "ds"},
        files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        headers=headers)
    return r.json()["id"]


async def _train(client: AsyncClient, headers: dict, ds_id: str) -> str:
    r = await client.post("/api/v1/models/train",
        json={"name": "m", "dataset_id": ds_id, "algorithm": "classification",
              "target_column": "label", "feature_columns": ["a", "b"]},
        headers=headers)
    return r.json()["id"]


class TestDatasetIsolation:
    async def test_cannot_get_another_users_dataset(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "owner1@test.com")
        h2 = await _register_and_login(client, "other1@test.com")
        ds_id = await _upload(client, h1)
        r = await client.get(f"/api/v1/datasets/{ds_id}", headers=h2)
        assert r.status_code == 404

    async def test_cannot_delete_another_users_dataset(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "owner2@test.com")
        h2 = await _register_and_login(client, "other2@test.com")
        ds_id = await _upload(client, h1)
        r = await client.delete(f"/api/v1/datasets/{ds_id}", headers=h2)
        assert r.status_code == 404

    async def test_cannot_profile_another_users_dataset(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "owner3@test.com")
        h2 = await _register_and_login(client, "other3@test.com")
        ds_id = await _upload(client, h1)
        r = await client.get(f"/api/v1/datasets/{ds_id}/profile", headers=h2)
        assert r.status_code == 404

    async def test_list_returns_only_own_datasets(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "owner4@test.com")
        h2 = await _register_and_login(client, "other4@test.com")
        await _upload(client, h1)
        await _upload(client, h1)
        r = await client.get("/api/v1/datasets/", headers=h2)
        assert r.status_code == 200
        assert len(r.json()) == 0


class TestModelIsolation:
    async def test_cannot_get_another_users_model(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "mowner1@test.com")
        h2 = await _register_and_login(client, "mother1@test.com")
        ds_id = await _upload(client, h1)
        model_id = await _train(client, h1, ds_id)
        r = await client.get(f"/api/v1/models/{model_id}", headers=h2)
        assert r.status_code == 404

    async def test_cannot_delete_another_users_model(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "mowner2@test.com")
        h2 = await _register_and_login(client, "mother2@test.com")
        ds_id = await _upload(client, h1)
        model_id = await _train(client, h1, ds_id)
        r = await client.delete(f"/api/v1/models/{model_id}", headers=h2)
        assert r.status_code == 404

    async def test_cannot_predict_with_another_users_model(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "mowner3@test.com")
        h2 = await _register_and_login(client, "mother3@test.com")
        ds_id = await _upload(client, h1)
        model_id = await _train(client, h1, ds_id)
        r = await client.post(f"/api/v1/models/{model_id}/predict",
            json={"data": [{"a": 0.1, "b": 0.2}]}, headers=h2)
        assert r.status_code == 404

    async def test_list_returns_only_own_models(self, client: AsyncClient) -> None:
        h1 = await _register_and_login(client, "mowner4@test.com")
        h2 = await _register_and_login(client, "mother4@test.com")
        ds_id = await _upload(client, h1)
        await _train(client, h1, ds_id)
        r = await client.get("/api/v1/models/", headers=h2)
        assert r.status_code == 200
        assert len(r.json()) == 0
