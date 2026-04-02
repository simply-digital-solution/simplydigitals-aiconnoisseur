"""Unit tests for the dataset history endpoint and 5-file-per-user limit."""

from __future__ import annotations

import csv
import io

import pytest
from httpx import AsyncClient


def _csv_bytes(rows: int = 10) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["a", "b"])
    import random

    rng = random.Random(42)
    for _ in range(rows):
        writer.writerow([rng.gauss(0, 1), rng.gauss(5, 2)])
    return buf.getvalue().encode()


async def _upload(client: AsyncClient, headers: dict, name: str = "ds") -> dict:
    r = await client.post(
        "/api/v1/datasets/",
        data={"name": name},
        files={"file": ("data.csv", _csv_bytes(), "text/csv")},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


class TestDatasetHistory:
    async def test_history_empty_for_new_user(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == []

    async def test_history_requires_auth(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/datasets/history")
        assert r.status_code in (401, 403)

    async def test_history_returns_uploaded_datasets(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        await _upload(client, auth_headers, "first")
        await _upload(client, auth_headers, "second")

        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        assert r.status_code == 200
        names = [d["name"] for d in r.json()]
        assert "first" in names
        assert "second" in names

    async def test_history_sorted_newest_first(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        await _upload(client, auth_headers, "older")
        await _upload(client, auth_headers, "newer")

        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        assert r.status_code == 200
        names = [d["name"] for d in r.json()]
        # newer was uploaded last, so it must appear first
        assert names.index("newer") < names.index("older")

    async def test_history_capped_at_five(self, client: AsyncClient, auth_headers: dict) -> None:
        for i in range(6):
            await _upload(client, auth_headers, f"ds-{i}")

        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) == 5

    async def test_upload_enforces_5_file_limit(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        """Uploading 6 files should leave exactly 5 in the database."""
        for i in range(6):
            await _upload(client, auth_headers, f"limit-{i}")

        r = await client.get("/api/v1/datasets/", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) == 5

    async def test_oldest_dataset_evicted_on_overflow(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        await _upload(client, auth_headers, "first-ever")
        for i in range(4):
            await _upload(client, auth_headers, f"ds-{i}")

        # Upload the 6th — "first-ever" should be evicted
        await _upload(client, auth_headers, "sixth")

        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        names = [d["name"] for d in r.json()]
        assert "first-ever" not in names
        assert "sixth" in names

    async def test_history_response_schema(self, client: AsyncClient, auth_headers: dict) -> None:
        await _upload(client, auth_headers, "schema-check")
        r = await client.get("/api/v1/datasets/history", headers=auth_headers)
        assert r.status_code == 200
        item = r.json()[0]
        for field in ("id", "name", "row_count", "column_count", "created_at", "owner_id"):
            assert field in item, f"missing field: {field}"
