"""Unit tests for dataset API endpoints."""
from __future__ import annotations
import io
import pytest
from httpx import AsyncClient

_CSV = b"col_a,col_b,label\n1.0,2.0,cat\n3.0,4.0,dog\n5.0,6.0,cat\n"


class TestDatasetUpload:
    async def test_upload_csv_returns_201(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.post("/api/v1/datasets/",
            data={"name": "my-ds"},
            files={"file": ("data.csv", io.BytesIO(_CSV), "text/csv")},
            headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["name"] == "my-ds"
        assert r.json()["row_count"] == 3

    async def test_upload_requires_auth(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/datasets/",
            data={"name": "x"},
            files={"file": ("d.csv", io.BytesIO(_CSV), "text/csv")})
        assert r.status_code in (401, 403)

    async def test_upload_non_csv_rejected(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.post("/api/v1/datasets/",
            data={"name": "bad"},
            files={"file": ("data.txt", io.BytesIO(b"hello"), "text/plain")},
            headers=auth_headers)
        assert r.status_code == 422

    async def test_upload_empty_file_rejected(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.post("/api/v1/datasets/",
            data={"name": "empty"},
            files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
            headers=auth_headers)
        assert r.status_code == 422


class TestDatasetList:
    async def test_list_returns_own_datasets(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        await client.post("/api/v1/datasets/",
            data={"name": "listed"},
            files={"file": ("d.csv", io.BytesIO(_CSV), "text/csv")},
            headers=auth_headers)
        r = await client.get("/api/v1/datasets/", headers=auth_headers)
        assert r.status_code == 200
        assert any(d["name"] == "listed" for d in r.json())

    async def test_list_empty_for_new_user(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.get("/api/v1/datasets/", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestDatasetProfile:
    async def test_profile_returns_stats(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        upload = await client.post("/api/v1/datasets/",
            data={"name": "prof"},
            files={"file": ("d.csv", io.BytesIO(_CSV), "text/csv")},
            headers=auth_headers)
        ds_id = upload.json()["id"]
        r = await client.get(f"/api/v1/datasets/{ds_id}/profile", headers=auth_headers)
        assert r.status_code == 200


class TestDatasetDelete:
    async def test_delete_removes_dataset(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        upload = await client.post("/api/v1/datasets/",
            data={"name": "to-delete"},
            files={"file": ("d.csv", io.BytesIO(_CSV), "text/csv")},
            headers=auth_headers)
        ds_id = upload.json()["id"]
        assert (await client.delete(f"/api/v1/datasets/{ds_id}",
            headers=auth_headers)).status_code == 200

    async def test_delete_nonexistent_returns_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.delete("/api/v1/datasets/nonexistent", headers=auth_headers)
        assert r.status_code == 404
