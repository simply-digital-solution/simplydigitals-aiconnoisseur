"""Unit tests for authentication API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

_PW = "StrongPass1!"
_BAD_PW = "WrongPass1!"


class TestRegister:
    async def test_register_success(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@example.com", "password": _PW, "full_name": "New"},
        )
        assert r.status_code == 201
        assert r.json()["email"] == "new@example.com"
        assert "hashed_password" not in r.json()

    async def test_register_duplicate_email(self, client: AsyncClient) -> None:
        p = {"email": "dup@example.com", "password": _PW, "full_name": "Dup"}
        await client.post("/api/v1/auth/register", json=p)
        assert (await client.post("/api/v1/auth/register", json=p)).status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/register", json={"email": "bad", "password": _PW, "full_name": "X"}
        )
        assert r.status_code == 422

    async def test_register_short_password(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "x@y.com", "password": "short", "full_name": "X"},
        )
        assert r.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login@example.com", "password": _PW, "full_name": "L"},
        )
        r = await client.post(
            "/api/v1/auth/login", json={"email": "login@example.com", "password": _PW}
        )
        assert r.status_code == 200
        assert "access_token" in r.json()
        assert "refresh_token" in r.json()

    async def test_login_wrong_password(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "login2@example.com", "password": _PW, "full_name": "L"},
        )
        r = await client.post(
            "/api/v1/auth/login", json={"email": "login2@example.com", "password": _BAD_PW}
        )
        assert r.status_code == 401

    async def test_login_unknown_user(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/login", json={"email": "ghost@example.com", "password": _PW}
        )
        assert r.status_code == 401


class TestRefresh:
    async def test_refresh_returns_new_tokens(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "ref@example.com", "password": _PW, "full_name": "R"},
        )
        login = await client.post(
            "/api/v1/auth/login", json={"email": "ref@example.com", "password": _PW}
        )
        r = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": login.json()["refresh_token"]}
        )
        assert r.status_code == 200
        assert "access_token" in r.json()

    async def test_refresh_invalid_token(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.token"})
        assert r.status_code == 401

    async def test_refresh_with_access_token_rejected(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "ref2@example.com", "password": _PW, "full_name": "R"},
        )
        login = await client.post(
            "/api/v1/auth/login", json={"email": "ref2@example.com", "password": _PW}
        )
        r = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": login.json()["access_token"]}
        )
        assert r.status_code == 401


class TestMe:
    async def test_me_returns_user_profile(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "me@example.com", "password": _PW, "full_name": "Me User"},
        )
        login = await client.post(
            "/api/v1/auth/login", json={"email": "me@example.com", "password": _PW}
        )
        token = login.json()["access_token"]
        r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == "me@example.com"
        assert body["full_name"] == "Me User"

    async def test_me_has_no_sensitive_fields(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "me2@example.com", "password": _PW, "full_name": "Me2"},
        )
        login = await client.post(
            "/api/v1/auth/login", json={"email": "me2@example.com", "password": _PW}
        )
        token = login.json()["access_token"]
        r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        body = r.json()
        assert "hashed_password" not in body
        assert "password" not in body

    async def test_me_requires_auth(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/auth/me")
        assert r.status_code in (401, 403)

    async def test_me_rejects_invalid_token(self, client: AsyncClient) -> None:
        r = await client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.token"}
        )
        assert r.status_code in (401, 403)


class TestRegisterEdgeCases:
    async def test_missing_full_name_rejected(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/register", json={"email": "x@y.com", "password": _PW})
        assert r.status_code == 422

    async def test_missing_password_rejected(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/register", json={"email": "x@y.com", "full_name": "X"})
        assert r.status_code == 422

    async def test_password_too_long_rejected(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "long@y.com", "password": "a" * 65, "full_name": "X"},
        )
        assert r.status_code == 422

    async def test_register_response_has_no_sensitive_fields(self, client: AsyncClient) -> None:
        r = await client.post(
            "/api/v1/auth/register",
            json={"email": "safe@example.com", "password": _PW, "full_name": "Safe"},
        )
        body = r.json()
        assert "hashed_password" not in body
        assert "password" not in body

    async def test_login_response_contains_token_type(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={"email": "ttype@example.com", "password": _PW, "full_name": "T"},
        )
        r = await client.post(
            "/api/v1/auth/login", json={"email": "ttype@example.com", "password": _PW}
        )
        assert r.json().get("token_type") == "bearer"
