"""Smoke tests — verify basic API and UI availability post-deployment."""

from __future__ import annotations

import httpx
import pytest


class TestAPIHealth:
    def test_health_returns_200(self, client: httpx.Client) -> None:
        r = client.get("/health")
        assert r.status_code == 200, f"Health endpoint failed: {r.text}"

    def test_health_body_has_status_ok(self, client: httpx.Client) -> None:
        r = client.get("/health")
        body = r.json()
        assert body.get("status") == "ok", f"Unexpected health body: {body}"

    def test_auth_register_route_responds(self, client: httpx.Client) -> None:
        # POST with empty body → 422 (validation error), not 404 — confirms route exists
        r = client.post("/api/v1/auth/register", json={})
        assert r.status_code == 422, f"Register route returned unexpected {r.status_code}"

    def test_auth_login_route_responds(self, client: httpx.Client) -> None:
        r = client.post("/api/v1/auth/login", json={})
        assert r.status_code == 422, f"Login route returned unexpected {r.status_code}"

    def test_auth_me_route_exists(self, client: httpx.Client) -> None:
        # No token → 401/403, not 404 — confirms route is registered
        r = client.get("/api/v1/auth/me")
        assert r.status_code in (
            401,
            403,
        ), f"/me route returned {r.status_code} — expected 401/403, not 404"


class TestUIAvailability:
    def test_ui_returns_200(self, ui_url: str | None) -> None:
        if not ui_url:
            pytest.skip("PROD_UI_URL not configured")
        r = httpx.get(ui_url, timeout=15.0, follow_redirects=True)
        assert r.status_code == 200, f"UI returned {r.status_code}"

    def test_ui_serves_html(self, ui_url: str | None) -> None:
        if not ui_url:
            pytest.skip("PROD_UI_URL not configured")
        r = httpx.get(ui_url, timeout=15.0, follow_redirects=True)
        assert "text/html" in r.headers.get("content-type", ""), "UI did not serve HTML"

    def test_ui_contains_app_root(self, ui_url: str | None) -> None:
        if not ui_url:
            pytest.skip("PROD_UI_URL not configured")
        r = httpx.get(ui_url, timeout=15.0, follow_redirects=True)
        assert '<div id="root">' in r.text, "UI HTML is missing the React root element"
