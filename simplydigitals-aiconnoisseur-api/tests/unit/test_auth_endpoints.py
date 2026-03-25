"""Unit tests for authentication API endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

_PW = "StrongPass1!"
_BAD_PW = "WrongPass1!"


class TestRegister:
    async def test_register_success(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/register",
            json={"email": "new@example.com", "password": _PW, "full_name": "New"})
        assert r.status_code == 201
        assert r.json()["email"] == "new@example.com"
        assert "hashed_password" not in r.json()

    async def test_register_duplicate_email(self, client: AsyncClient) -> None:
        p = {"email": "dup@example.com", "password": _PW, "full_name": "Dup"}
        await client.post("/api/v1/auth/register", json=p)
        assert (await client.post("/api/v1/auth/register", json=p)).status_code == 409

    async def test_register_invalid_email(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/register",
            json={"email": "bad", "password": _PW, "full_name": "X"})
        assert r.status_code == 422

    async def test_register_short_password(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/register",
            json={"email": "x@y.com", "password": "short", "full_name": "X"})
        assert r.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient) -> None:
        await client.post("/api/v1/auth/register",
            json={"email": "login@example.com", "password": _PW, "full_name": "L"})
        r = await client.post("/api/v1/auth/login",
            json={"email": "login@example.com", "password": _PW})
        assert r.status_code == 200
        assert "access_token" in r.json()
        assert "refresh_token" in r.json()

    async def test_login_wrong_password(self, client: AsyncClient) -> None:
        await client.post("/api/v1/auth/register",
            json={"email": "login2@example.com", "password": _PW, "full_name": "L"})
        r = await client.post("/api/v1/auth/login",
            json={"email": "login2@example.com", "password": _BAD_PW})
        assert r.status_code == 401

    async def test_login_unknown_user(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": _PW})
        assert r.status_code == 401


class TestRefresh:
    async def test_refresh_returns_new_tokens(self, client: AsyncClient) -> None:
        await client.post("/api/v1/auth/register",
            json={"email": "ref@example.com", "password": _PW, "full_name": "R"})
        login = await client.post("/api/v1/auth/login",
            json={"email": "ref@example.com", "password": _PW})
        r = await client.post("/api/v1/auth/refresh",
            json={"refresh_token": login.json()["refresh_token"]})
        assert r.status_code == 200
        assert "access_token" in r.json()

    async def test_refresh_invalid_token(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/auth/refresh",
            json={"refresh_token": "not.a.token"})
        assert r.status_code == 401
