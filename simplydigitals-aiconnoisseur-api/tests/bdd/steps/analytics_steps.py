"""Behave step definitions for analytics.feature."""

from __future__ import annotations

import csv
import tempfile

import numpy as np
from behave import given, then, when  # type: ignore[import-untyped]
from behave.runner import Context  # type: ignore[import-untyped]


@given("I have uploaded a numeric dataset")
def step_upload_numeric(ctx: Context) -> None:
    rng = np.random.default_rng(0)
    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w")
    writer = csv.writer(tmp)
    writer.writerow(["a", "b", "c"])
    for _ in range(100):
        writer.writerow([round(float(rng.normal()), 4) for _ in range(3)])
    tmp.close()
    ctx._num_csv = tmp.name  # noqa: SLF001

    with open(tmp.name, "rb") as f:
        resp = ctx.client.post(
            "/api/v1/datasets/",
            data={"name": "numeric-dataset"},
            files={"file": ("data.csv", f, "text/csv")},
            headers=ctx.auth_headers,
        )
    ctx.dataset_id = resp.json()["id"]


@given("I have uploaded a time-series dataset")
def step_upload_timeseries(ctx: Context) -> None:
    import datetime  # noqa: PLC0415

    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w")
    writer = csv.writer(tmp)
    writer.writerow(["date", "value"])
    base = datetime.date(2023, 1, 1)
    for i in range(60):
        writer.writerow([str(base + datetime.timedelta(days=i)), round(i * 1.5 + 10, 2)])
    tmp.close()
    ctx._ts_csv = tmp.name  # noqa: SLF001

    with open(tmp.name, "rb") as f:
        resp = ctx.client.post(
            "/api/v1/datasets/",
            data={"name": "ts-dataset"},
            files={"file": ("data.csv", f, "text/csv")},
            headers=ctx.auth_headers,
        )
    ctx.ts_dataset_id = resp.json()["id"]


@when('I POST to "/api/v1/analytics/describe" with my dataset id')
def step_describe(ctx: Context) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/analytics/describe",
        json={"dataset_id": ctx.dataset_id},
        headers=ctx.auth_headers,
    )


@when('I POST to "/api/v1/analytics/correlation" with my dataset id')
def step_correlation(ctx: Context) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/analytics/correlation",
        json={"dataset_id": ctx.dataset_id},
        headers=ctx.auth_headers,
    )


@when('I POST to "/api/v1/analytics/describe" with dataset id "{dataset_id}"')
def step_describe_bad(ctx: Context, dataset_id: str) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/analytics/describe",
        json={"dataset_id": dataset_id},
        headers=ctx.auth_headers,
    )


@when("I POST a forecast request for {periods:d} periods")
def step_forecast(ctx: Context, periods: int) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/analytics/forecast",
        json={
            "dataset_id": ctx.ts_dataset_id,
            "date_column": "date",
            "value_column": "value",
            "periods": periods,
        },
        headers=ctx.auth_headers,
    )


@then("the response contains descriptive stats keys")
def step_desc_keys(ctx: Context) -> None:
    data = ctx.response.json()
    assert any(k in data for k in ("mean", "count", "a", "b")), f"Unexpected: {data}"


@then("the forecast list has {n:d} entries")
def step_forecast_count(ctx: Context, n: int) -> None:
    forecast = ctx.response.json().get("forecast", [])
    assert len(forecast) == n, f"Expected {n} entries, got {len(forecast)}"
