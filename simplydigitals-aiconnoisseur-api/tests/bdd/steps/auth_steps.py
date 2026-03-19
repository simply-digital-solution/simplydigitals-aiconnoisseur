"""Behave step definitions for authentication.feature."""

from __future__ import annotations

from behave import given, then, when  # type: ignore[import-untyped]
from behave.runner import Context  # type: ignore[import-untyped]


# ─────────────────────────────────────────────────────────────────────────────
# Given
# ─────────────────────────────────────────────────────────────────────────────


@given("the API is running")
def step_api_running(ctx: Context) -> None:
    assert ctx.client is not None


@given('a user exists with email "{email}" and password "{password}"')
def step_user_exists(ctx: Context, email: str, password: str) -> None:
    ctx.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )


@given('I am logged in as "{email}" with password "{password}"')
def step_logged_in(ctx: Context, email: str, password: str) -> None:
    response = ctx.client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    ctx.refresh_token = response.json().get("refresh_token")
    ctx.access_token = response.json().get("access_token")


# ─────────────────────────────────────────────────────────────────────────────
# When
# ─────────────────────────────────────────────────────────────────────────────


@when('I register with email "{email}" and password "{password}"')
def step_register(ctx: Context, email: str, password: str) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )


@when('I login with email "{email}" and password "{password}"')
def step_login(ctx: Context, email: str, password: str) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )


@when("I refresh my token")
def step_refresh(ctx: Context) -> None:
    ctx.response = ctx.client.post(
        "/api/v1/auth/refresh", json={"refresh_token": ctx.refresh_token}
    )


@when('I GET "{path}" without authentication')
def step_get_no_auth(ctx: Context, path: str) -> None:
    ctx.response = ctx.client.get(path)


# ─────────────────────────────────────────────────────────────────────────────
# Then
# ─────────────────────────────────────────────────────────────────────────────


@then("the response status is {code:d}")
def step_status(ctx: Context, code: int) -> None:
    assert ctx.response.status_code == code, (
        f"Expected {code}, got {ctx.response.status_code}. Body: {ctx.response.text}"
    )


@then('the response contains field "{field}"')
def step_contains_field(ctx: Context, field: str) -> None:
    assert field in ctx.response.json(), f"Field '{field}' not in {ctx.response.json()}"


@then('the response does not contain field "{field}"')
def step_not_contains_field(ctx: Context, field: str) -> None:
    assert field not in ctx.response.json()


@then('the response contains field "{field}" with value "{value}"')
def step_field_value(ctx: Context, field: str, value: str) -> None:
    assert ctx.response.json().get(field) == value


@then('the response field "{field}" equals "{value}"')
def step_field_equals_str(ctx: Context, field: str, value: str) -> None:
    assert str(ctx.response.json().get(field)) == value
