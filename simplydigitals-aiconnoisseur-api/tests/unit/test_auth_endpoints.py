"""Unit tests for authentication API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

# All passwords must be < 72 bytes (bcrypt hard limit)
_PASSWORD = "StrongPass1!"
_WRONG_PW  = "WrongPass1!"


class TestRegister:
    async def test_register_success(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@example.com",
                "password": _PASSWORD,
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert "id" in data
        assert "hashed_password" not in data

    async def test_register_duplicate_email(self, client: AsyncClient) -> None:
        payload = {"email": "dup@example.com", "password": _PASSWORD, "full_name": "Dup"}
        await client.post("/api/v1/auth/register", json=payload)
        response = await client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": _PASSWORD, "full_name": "X"},
        )
        assert response.status_code == 422

    async def test_register_short_password(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "x@y.com", "password": "short", "full_name": "X"},
        )
        assert response.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login@example.com", "password": _PASSWORD, "full_name": "Login User"},
        )
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "login@example.com", "password": _PASSWORD},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login2@example.com", "password": _PASSWORD, "full_name": "U"},
        )
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "login2@example.com", "password": _WRONG_PW},
        )
        assert response.status_code == 401

    async def test_login_unknown_user(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": _PASSWORD},
        )
        assert response.status_code == 401


class TestRefresh:
    async def test_refresh_returns_new_tokens(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "refresh@example.com", "password": _PASSWORD, "full_name": "R"},
        )
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "refresh@example.com", "password": _PASSWORD},
        )
        refresh_token = login.json()["refresh_token"]
        response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_refresh_invalid_token(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": "not.a.token"}
        )
        assert response.status_code == 401
