"""Unit tests for dataset upload, listing, profile, and delete endpoints."""

from __future__ import annotations

import csv
import io
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


def _csv_bytes(rows: int = 50) -> bytes:
    """Return a simple CSV file as bytes."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["feat_a", "feat_b", "label"])
    import random

    rng = random.Random(0)
    for _ in range(rows):
        writer.writerow([rng.gauss(0, 1), rng.gauss(5, 2), rng.choice(["yes", "no"])])
    return buf.getvalue().encode()


class TestDatasetUpload:
    async def test_upload_csv_returns_201(self, client: AsyncClient, auth_headers: dict) -> None:
        response = await client.post(
            "/api/v1/datasets/",
            data={"name": "test-ds"},
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "test-ds"
        assert data["row_count"] == 50
        assert data["column_count"] == 3

    async def test_upload_non_csv_rejected(self, client: AsyncClient, auth_headers: dict) -> None:
        response = await client.post(
            "/api/v1/datasets/",
            data={"name": "bad"},
            files={"file": ("data.json", b'{"a":1}', "application/json")},
            headers=auth_headers,
        )
        assert response.status_code in (400, 422)

    async def test_upload_empty_file_rejected(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        response = await client.post(
            "/api/v1/datasets/",
            data={"name": "empty"},
            files={"file": ("empty.csv", b"", "text/csv")},
            headers=auth_headers,
        )
        assert response.status_code in (400, 422)

    async def test_upload_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/datasets/",
            data={"name": "unauth"},
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        )
        assert response.status_code in (401, 403)


class TestDatasetList:
    async def test_list_returns_own_datasets(self, client: AsyncClient, auth_headers: dict) -> None:
        # Upload two datasets
        for i in range(2):
            await client.post(
                "/api/v1/datasets/",
                data={"name": f"ds-{i}"},
                files={"file": ("data.csv", _csv_bytes(), "text/csv")},
                headers=auth_headers,
            )
        response = await client.get("/api/v1/datasets/", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) >= 2

    async def test_list_empty_for_new_user(self, client: AsyncClient, auth_headers: dict) -> None:
        response = await client.get("/api/v1/datasets/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestDatasetGetById:
    async def test_get_own_dataset_by_id(self, client: AsyncClient, auth_headers: dict) -> None:
        upload = await client.post(
            "/api/v1/datasets/",
            data={"name": "get-ds"},
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
            headers=auth_headers,
        )
        ds_id = upload.json()["id"]
        r = await client.get(f"/api/v1/datasets/{ds_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == ds_id

    async def test_get_nonexistent_dataset_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.get("/api/v1/datasets/nonexistent-id", headers=auth_headers)
        assert r.status_code == 404

    async def test_get_dataset_requires_auth(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/datasets/any-id")
        assert r.status_code in (401, 403)


class TestDatasetProfile:
    async def test_profile_returns_stats(self, client: AsyncClient, auth_headers: dict) -> None:
        upload = await client.post(
            "/api/v1/datasets/",
            data={"name": "profile-ds"},
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
            headers=auth_headers,
        )
        ds_id = upload.json()["id"]

        response = await client.get(f"/api/v1/datasets/{ds_id}/profile", headers=auth_headers)
        assert response.status_code == 200
        profile = response.json()
        assert "profile" in profile
        assert profile["row_count"] == 50


class TestDatasetDelete:
    async def test_delete_removes_dataset(self, client: AsyncClient, auth_headers: dict) -> None:
        upload = await client.post(
            "/api/v1/datasets/",
            data={"name": "to-delete"},
            files={"file": ("data.csv", _csv_bytes(), "text/csv")},
            headers=auth_headers,
        )
        ds_id = upload.json()["id"]

        delete_resp = await client.delete(f"/api/v1/datasets/{ds_id}", headers=auth_headers)
        assert delete_resp.status_code in (200, 204)

        get_resp = await client.get(f"/api/v1/datasets/{ds_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        response = await client.delete("/api/v1/datasets/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    async def test_delete_calls_s3_delete_object_when_s3_key_set(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """When a dataset has an s3_key, deleting it must remove the S3 object."""
        from app.modules.datasets.models import Dataset
        from app.shared import s3_service

        deleted_keys: list[str] = []

        monkeypatch.setattr(s3_service, "is_enabled", lambda: True)
        monkeypatch.setattr(s3_service, "delete_object", lambda key: deleted_keys.append(key))

        # Insert a dataset directly with a fake s3_key
        ds = Dataset(
            name="s3-backed",
            file_path="/tmp/fake.csv",
            s3_key="datasets/user/fake-uuid.csv",
            row_count=10,
            column_count=3,
            owner_id="test-owner",
        )
        db_session.add(ds)
        await db_session.commit()
        await db_session.refresh(ds)

        # Override owner so auth passes
        from app.modules.auth.models import User
        from sqlalchemy import select

        result = await db_session.execute(select(User))
        user = result.scalar_one()
        ds.owner_id = user.id
        await db_session.commit()
        await db_session.refresh(ds)

        resp = await client.delete(f"/api/v1/datasets/{ds.id}", headers=auth_headers)
        assert resp.status_code in (200, 204)
        assert ds.s3_key in deleted_keys
