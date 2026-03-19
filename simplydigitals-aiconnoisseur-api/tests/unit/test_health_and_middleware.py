"""Unit tests for health endpoint and security middleware."""

from __future__ import annotations

from httpx import AsyncClient


class TestHealthEndpoint:
    async def test_health_returns_ok(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_health_returns_version(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert "version" in response.json()


class TestSecurityHeaders:
    async def test_x_content_type_options_header(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert response.headers.get("x-content-type-options") == "nosniff"

    async def test_x_frame_options_header(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert response.headers.get("x-frame-options") == "DENY"

    async def test_xss_protection_header(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert "x-xss-protection" in response.headers

    async def test_referrer_policy_header(self, client: AsyncClient) -> None:
        response = await client.get("/health")
        assert "referrer-policy" in response.headers


class TestProtectedEndpoints:
    async def test_models_requires_auth(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/models/")
        assert response.status_code == 403

    async def test_analytics_requires_auth(self, client: AsyncClient) -> None:
        response = await client.post("/api/v1/analytics/describe", json={"dataset_id": "x"})
        assert response.status_code == 403

    async def test_invalid_bearer_token_rejected(self, client: AsyncClient) -> None:
        response = await client.get(
            "/api/v1/models/", headers={"Authorization": "Bearer totally.invalid.token"}
        )
        assert response.status_code == 401
