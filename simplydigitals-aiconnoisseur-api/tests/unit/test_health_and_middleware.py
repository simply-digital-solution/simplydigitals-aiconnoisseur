"""Unit tests for health endpoint and security middleware."""
from __future__ import annotations
from httpx import AsyncClient


class TestHealthEndpoint:
    async def test_health_returns_ok(self, client: AsyncClient) -> None:
        r = await client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    async def test_health_returns_version(self, client: AsyncClient) -> None:
        assert "version" in (await client.get("/health")).json()


class TestSecurityHeaders:
    async def test_x_content_type_options_header(self, client: AsyncClient) -> None:
        assert (await client.get("/health")).headers.get("x-content-type-options") == "nosniff"

    async def test_x_frame_options_header(self, client: AsyncClient) -> None:
        assert (await client.get("/health")).headers.get("x-frame-options") == "DENY"

    async def test_xss_protection_header(self, client: AsyncClient) -> None:
        assert "x-xss-protection" in (await client.get("/health")).headers

    async def test_referrer_policy_header(self, client: AsyncClient) -> None:
        assert "referrer-policy" in (await client.get("/health")).headers


class TestProtectedEndpoints:
    async def test_models_requires_auth(self, client: AsyncClient) -> None:
        assert (await client.get("/api/v1/models/")).status_code in (401, 403)

    async def test_analytics_requires_auth(self, client: AsyncClient) -> None:
        r = await client.post("/api/v1/analytics/describe", json={"dataset_id": "x"})
        assert r.status_code in (401, 403)

    async def test_invalid_bearer_token_rejected(self, client: AsyncClient) -> None:
        r = await client.get("/api/v1/models/",
            headers={"Authorization": "Bearer totally.invalid.token"})
        assert r.status_code == 401
