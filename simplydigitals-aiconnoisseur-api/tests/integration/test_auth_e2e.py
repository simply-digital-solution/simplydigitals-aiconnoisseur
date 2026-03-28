"""End-to-end auth flow tests against the live production API.

Tests execute in declaration order — they share state via module-level variables
that are populated as the flow progresses:
  register → login → /me → refresh → protected access → conflict checks
"""

from __future__ import annotations

import httpx
import pytest

_PW = "IntegrationTest1!"
_BAD_PW = "WrongPassword99!"

# Filled in by test_register_success; used by subsequent tests
_access_token: str = ""
_refresh_token: str = ""


class TestRegistration:
    def test_register_success(self, client: httpx.Client, unique_email: str) -> None:
        r = client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": _PW, "full_name": "CI Probe User"},
        )
        assert r.status_code == 201, f"Registration failed ({r.status_code}): {r.text}"

    def test_register_response_has_email(self, client: httpx.Client, unique_email: str) -> None:
        # Re-register is idempotent check — use a fresh email to isolate
        import time

        fresh = f"ci-reg-check-{int(time.time())}@example.com"
        r = client.post(
            "/api/v1/auth/register",
            json={"email": fresh, "password": _PW, "full_name": "CI Reg Check"},
        )
        assert r.status_code == 201
        assert r.json().get("email") == fresh

    def test_register_no_sensitive_fields_in_response(
        self, client: httpx.Client, unique_email: str
    ) -> None:
        import time

        fresh = f"ci-safe-{int(time.time())}@example.com"
        r = client.post(
            "/api/v1/auth/register",
            json={"email": fresh, "password": _PW, "full_name": "CI Safe"},
        )
        body = r.json()
        assert "hashed_password" not in body, "hashed_password leaked in registration response"
        assert "password" not in body, "password leaked in registration response"

    def test_duplicate_registration_returns_409(
        self, client: httpx.Client, unique_email: str
    ) -> None:
        # unique_email was registered in test_register_success
        r = client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": _PW, "full_name": "Duplicate"},
        )
        assert (
            r.status_code == 409
        ), f"Expected 409 for duplicate email, got {r.status_code}: {r.text}"

    def test_register_invalid_email_returns_422(self, client: httpx.Client) -> None:
        r = client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": _PW, "full_name": "Bad"},
        )
        assert r.status_code == 422

    def test_register_weak_password_returns_422(self, client: httpx.Client) -> None:
        r = client.post(
            "/api/v1/auth/register",
            json={"email": "weak@test.invalid", "password": "short", "full_name": "Weak"},
        )
        assert r.status_code == 422


class TestLogin:
    def test_login_success_returns_tokens(self, client: httpx.Client, unique_email: str) -> None:
        global _access_token, _refresh_token
        r = client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": _PW},
        )
        assert r.status_code == 200, f"Login failed ({r.status_code}): {r.text}"
        body = r.json()
        assert "access_token" in body, "Login response missing access_token"
        assert "refresh_token" in body, "Login response missing refresh_token"
        _access_token = body["access_token"]
        _refresh_token = body["refresh_token"]

    def test_login_response_has_bearer_token_type(
        self, client: httpx.Client, unique_email: str
    ) -> None:
        r = client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": _PW},
        )
        assert r.json().get("token_type") == "bearer"

    def test_login_wrong_password_returns_401(
        self, client: httpx.Client, unique_email: str
    ) -> None:
        r = client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": _BAD_PW},
        )
        assert r.status_code == 401, f"Expected 401 for wrong password, got {r.status_code}"

    def test_login_unknown_user_returns_401(self, client: httpx.Client) -> None:
        import time

        ghost = f"ghost-{int(time.time())}@example.com"
        r = client.post(
            "/api/v1/auth/login",
            json={"email": ghost, "password": _PW},
        )
        assert r.status_code == 401


class TestUserProfile:
    def test_me_returns_correct_profile(self, client: httpx.Client, unique_email: str) -> None:
        if not _access_token:
            pytest.skip("No access token — TestLogin must run first")
        r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {_access_token}"})
        assert r.status_code == 200, f"/me failed ({r.status_code}): {r.text}"
        body = r.json()
        assert body.get("email") == unique_email
        assert body.get("full_name") == "CI Probe User"

    def test_me_has_no_sensitive_fields(self, client: httpx.Client) -> None:
        if not _access_token:
            pytest.skip("No access token — TestLogin must run first")
        r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {_access_token}"})
        body = r.json()
        assert "hashed_password" not in body
        assert "password" not in body

    def test_me_requires_auth(self, client: httpx.Client) -> None:
        r = client.get("/api/v1/auth/me")
        assert r.status_code in (401, 403)

    def test_me_rejects_invalid_token(self, client: httpx.Client) -> None:
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not.a.valid.token"},
        )
        assert r.status_code in (401, 403)


class TestTokenRefresh:
    def test_refresh_returns_new_access_token(self, client: httpx.Client) -> None:
        if not _refresh_token:
            pytest.skip("No refresh token — TestLogin must run first")
        r = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": _refresh_token},
        )
        assert r.status_code == 200, f"Refresh failed ({r.status_code}): {r.text}"
        assert "access_token" in r.json()

    def test_refresh_new_token_can_access_profile(self, client: httpx.Client) -> None:
        if not _refresh_token:
            pytest.skip("No refresh token — TestLogin must run first")
        refresh_r = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": _refresh_token},
        )
        new_token = refresh_r.json()["access_token"]
        me_r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {new_token}"},
        )
        assert me_r.status_code == 200, f"/me with refreshed token failed: {me_r.text}"

    def test_refresh_with_access_token_rejected(self, client: httpx.Client) -> None:
        if not _access_token:
            pytest.skip("No access token — TestLogin must run first")
        r = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": _access_token},  # intentionally wrong token type
        )
        assert r.status_code == 401

    def test_refresh_with_garbage_token_rejected(self, client: httpx.Client) -> None:
        r = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "garbage.token.value"},
        )
        assert r.status_code == 401
