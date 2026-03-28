"""Fixtures for production integration tests.

These tests run against the live deployed API and UI.
Set the following environment variables before running:

  PROD_API_URL   https://<api-gateway-id>.execute-api.ap-southeast-2.amazonaws.com
  PROD_UI_URL    https://<cloudfront-id>.cloudfront.net   (optional)
"""

from __future__ import annotations

import os
import time

import httpx
import pytest


@pytest.fixture(scope="session")
def api_url() -> str:
    url = os.environ.get("PROD_API_URL", "").rstrip("/")
    if not url:
        pytest.skip("PROD_API_URL environment variable is not set")
    return url


@pytest.fixture(scope="session")
def ui_url() -> str | None:
    return os.environ.get("PROD_UI_URL", "").rstrip("/") or None


@pytest.fixture(scope="session")
def client(api_url: str) -> httpx.Client:
    with httpx.Client(base_url=api_url, timeout=30.0) as c:
        yield c


@pytest.fixture(scope="session")
def unique_email() -> str:
    """One unique test email shared across all auth tests in the session."""
    # example.com is RFC 2606-reserved for testing — accepted by pydantic email-validator
    return f"ci-probe-{int(time.time())}@example.com"
