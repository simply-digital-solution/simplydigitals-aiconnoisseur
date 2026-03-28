"""Unit tests for analytics endpoints."""

from __future__ import annotations

import csv
import datetime
import io

from httpx import AsyncClient


def _numeric_csv(rows: int = 80) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["x", "y", "z"])

    import random

    rng = random.Random(1)
    for _ in range(rows):
        writer.writerow([round(rng.gauss(0, 1), 4) for _ in range(3)])
    return buf.getvalue().encode()


def _timeseries_csv(days: int = 60) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "value"])
    base = datetime.date(2023, 1, 1)
    for i in range(days):
        writer.writerow([str(base + datetime.timedelta(days=i)), round(i * 1.5 + 10, 2)])
    return buf.getvalue().encode()


async def _upload(client: AsyncClient, headers: dict, name: str, content: bytes) -> str:
    resp = await client.post(
        "/api/v1/datasets/",
        data={"name": name},
        files={"file": ("data.csv", content, "text/csv")},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


class TestDescribeEndpoint:
    async def test_describe_returns_stats(self, client: AsyncClient, auth_headers: dict) -> None:
        ds_id = await _upload(client, auth_headers, "num-ds", _numeric_csv())
        response = await client.post(
            "/api/v1/analytics/describe",
            json={"dataset_id": ds_id},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        # describe() returns column-keyed dict
        assert any(col in data for col in ("x", "y", "z"))

    async def test_describe_specific_columns(self, client: AsyncClient, auth_headers: dict) -> None:
        ds_id = await _upload(client, auth_headers, "num-ds2", _numeric_csv())
        response = await client.post(
            "/api/v1/analytics/describe",
            json={"dataset_id": ds_id, "columns": ["x", "y"]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "z" not in response.json()

    async def test_describe_unknown_dataset_404(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        response = await client.post(
            "/api/v1/analytics/describe",
            json={"dataset_id": "does-not-exist"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestCorrelationEndpoint:
    async def test_correlation_returns_matrix(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload(client, auth_headers, "corr-ds", _numeric_csv())
        response = await client.post(
            "/api/v1/analytics/correlation",
            json={"dataset_id": ds_id},
            headers=auth_headers,
        )
        assert response.status_code == 200
        matrix = response.json()["correlation_matrix"]
        # Diagonal should be 1.0
        assert abs(matrix["x"]["x"] - 1.0) < 0.001

    async def test_correlation_symmetric(self, client: AsyncClient, auth_headers: dict) -> None:
        ds_id = await _upload(client, auth_headers, "corr-sym", _numeric_csv())
        response = await client.post(
            "/api/v1/analytics/correlation",
            json={"dataset_id": ds_id},
            headers=auth_headers,
        )
        matrix = response.json()["correlation_matrix"]
        assert abs(matrix["x"]["y"] - matrix["y"]["x"]) < 0.0001


class TestForecastEndpoint:
    async def test_forecast_returns_correct_periods(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload(client, auth_headers, "ts-ds", _timeseries_csv())
        response = await client.post(
            "/api/v1/analytics/forecast",
            json={
                "dataset_id": ds_id,
                "date_column": "date",
                "value_column": "value",
                "periods": 14,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["periods"] == 14
        assert len(body["forecast"]) == 14

    async def test_forecast_entries_have_date_and_value(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload(client, auth_headers, "ts-ds2", _timeseries_csv())
        response = await client.post(
            "/api/v1/analytics/forecast",
            json={
                "dataset_id": ds_id,
                "date_column": "date",
                "value_column": "value",
                "periods": 3,
            },
            headers=auth_headers,
        )
        for entry in response.json()["forecast"]:
            assert "date" in entry
            assert "predicted_value" in entry

    async def test_forecast_periods_validation(
        self, client: AsyncClient, auth_headers: dict
    ) -> None:
        ds_id = await _upload(client, auth_headers, "ts-ds3", _timeseries_csv())
        response = await client.post(
            "/api/v1/analytics/forecast",
            json={
                "dataset_id": ds_id,
                "date_column": "date",
                "value_column": "value",
                "periods": 0,  # below minimum
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
