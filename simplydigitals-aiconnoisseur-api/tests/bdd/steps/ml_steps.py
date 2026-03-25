"""Behave step definitions for ml_training.feature."""

from __future__ import annotations

import csv
import os
import tempfile

import numpy as np
from behave import given, then, when  # type: ignore[import-untyped]
from behave.runner import Context  # type: ignore[import-untyped]


def _write_classification_csv(path: str, n: int = 150) -> None:
    rng = np.random.default_rng(42)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["feat_a", "feat_b", "label"])
        for _ in range(n):
            writer.writerow(
                [
                    round(float(rng.normal()), 4),
                    round(float(rng.normal(5, 2)), 4),
                    rng.choice(["cat", "dog"]),
                ]
            )


def _write_regression_csv(path: str, n: int = 150) -> None:
    rng = np.random.default_rng(42)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["x", "y"])
        for i in range(n):
            x = float(i) / 10
            writer.writerow([round(x, 4), round(x * 3 + float(rng.normal(0, 0.1)), 4)])


# ─────────────────────────────────────────────────────────────────────────────
# Given
# ─────────────────────────────────────────────────────────────────────────────


@given('I am authenticated as "{email}"')
def step_authenticated(ctx: Context, email: str) -> None:
    ctx.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "ML User"},
    )
    resp = ctx.client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Password123!"}
    )
    ctx.auth_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}


@given("I have uploaded a classification dataset")
def step_upload_classification(ctx: Context) -> None:
    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w")
    _write_classification_csv(tmp.name)
    tmp.close()
    ctx._tmp_csv = tmp.name  # noqa: SLF001

    with open(tmp.name, "rb") as f:
        resp = ctx.client.post(
            "/api/v1/datasets/",
            data={"name": "clf-dataset", "description": "BDD classification"},
            files={"file": ("data.csv", f, "text/csv")},
            headers=ctx.auth_headers,
        )
    ctx.dataset_id = resp.json()["id"]


@given("I have uploaded a regression dataset")
def step_upload_regression(ctx: Context) -> None:
    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w")
    _write_regression_csv(tmp.name)
    tmp.close()
    ctx._tmp_csv = tmp.name  # noqa: SLF001

    with open(tmp.name, "rb") as f:
        resp = ctx.client.post(
            "/api/v1/datasets/",
            data={"name": "reg-dataset"},
            files={"file": ("data.csv", f, "text/csv")},
            headers=ctx.auth_headers,
        )
    ctx.dataset_id = resp.json()["id"]


@given("I have trained a classification model")
def step_train_clf(ctx: Context) -> None:
    resp = ctx.client.post(
        "/api/v1/models/train",
        json={
            "name": "bdd-clf-model",
            "dataset_id": ctx.dataset_id,
            "algorithm": "classification",
            "target_column": "label",
            "feature_columns": ["feat_a", "feat_b"],
        },
        headers=ctx.auth_headers,
    )
    ctx.model_id = resp.json()["id"]


# ─────────────────────────────────────────────────────────────────────────────
# When
# ─────────────────────────────────────────────────────────────────────────────


@when('I submit a training request for algorithm "{algorithm}"')
def step_train_request(ctx: Context, algorithm: str) -> None:
    feature_map = {
        "classification": {"target_column": "label", "feature_columns": ["feat_a", "feat_b"]},
        "regression": {"target_column": "y", "feature_columns": ["x"]},
    }
    ctx.response = ctx.client.post(
        "/api/v1/models/train",
        json={
            "name": f"bdd-{algorithm}-model",
            "dataset_id": ctx.dataset_id,
            "algorithm": algorithm,
            **feature_map[algorithm],
        },
        headers=ctx.auth_headers,
    )
    if ctx.response.status_code == 201:
        ctx.model_id = ctx.response.json()["id"]


@when('I submit a training request with dataset_id "{dataset_id}"')
def step_train_bad_dataset(ctx: Context, dataset_id: str) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/models/train",
        json={
            "name": "bad",
            "dataset_id": dataset_id,
            "algorithm": "classification",
            "target_column": "label",
            "feature_columns": ["x"],
        },
        headers=ctx.auth_headers,
    )


@when('I GET "/api/v1/models/"')
def step_list_models(ctx: Context) -> None:
    ctx.response = ctx.client.get("/api/v1/models/", headers=ctx.auth_headers)


@when("I GET the model details")
def step_get_model(ctx: Context) -> None:
    ctx.response = ctx.client.get(f"/api/v1/models/{ctx.model_id}", headers=ctx.auth_headers)


@when("I submit a predict request with valid feature data")
def step_predict(ctx: Context) -> None:
    ctx.response = ctx.client.post(
        f"/api/v1/models/{ctx.model_id}/predict",
        json={"data": [{"feat_a": 0.5, "feat_b": 4.0}, {"feat_a": -1.0, "feat_b": 6.0}]},
        headers=ctx.auth_headers,
    )


@when("I DELETE the model")
def step_delete_model(ctx: Context) -> None:
    ctx.response = ctx.client.delete(
        f"/api/v1/models/{ctx.model_id}", headers=ctx.auth_headers
    )


# ─────────────────────────────────────────────────────────────────────────────
# Then
# ─────────────────────────────────────────────────────────────────────────────


@then("the response is a list with at least 1 item")
def step_list_not_empty(ctx: Context) -> None:
    data = ctx.response.json()
    assert isinstance(data, list) and len(data) >= 1


@then("the metrics contain {key}")
def step_metrics_key(ctx: Context, key: str) -> None:
    metrics = ctx.response.json().get("metrics", {})
    assert key.strip('"') in metrics, f"Key {key} not in metrics: {metrics}"


@then('the response field "{field}" equals {value:d}')
def step_field_equals_int(ctx: Context, field: str, value: int) -> None:
    assert ctx.response.json().get(field) == value
