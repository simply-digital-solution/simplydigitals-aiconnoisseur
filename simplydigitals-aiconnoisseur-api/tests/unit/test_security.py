"""Unit tests for app.core.security."""

from __future__ import annotations

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

# All test passwords must be < 72 bytes (bcrypt hard limit)
_SHORT_PASSWORD = "correct1!"
_WRONG_PASSWORD = "wrong1234!"


class TestPasswordHashing:
    def test_hash_returns_non_plain_text(self) -> None:
        hashed = hash_password(_SHORT_PASSWORD)
        assert hashed != _SHORT_PASSWORD

    def test_verify_correct_password(self) -> None:
        hashed = hash_password(_SHORT_PASSWORD)
        assert verify_password(_SHORT_PASSWORD, hashed) is True

    def test_verify_wrong_password(self) -> None:
        hashed = hash_password(_SHORT_PASSWORD)
        assert verify_password(_WRONG_PASSWORD, hashed) is False

    def test_two_hashes_of_same_password_differ(self) -> None:
        """bcrypt produces unique salts each time."""
        h1 = hash_password(_SHORT_PASSWORD)
        h2 = hash_password(_SHORT_PASSWORD)
        assert h1 != h2


class TestJWT:
    def test_access_token_encodes_subject(self) -> None:
        token = create_access_token("user-123")
        payload = decode_token(token, expected_type="access")
        assert payload["sub"] == "user-123"

    def test_refresh_token_encodes_subject(self) -> None:
        token = create_refresh_token("user-456")
        payload = decode_token(token, expected_type="refresh")
        assert payload["sub"] == "user-456"

    def test_wrong_token_type_raises(self) -> None:
        """Access token must not be accepted as refresh token."""
        token = create_access_token("user-123")
        with pytest.raises(JWTError):
            decode_token(token, expected_type="refresh")

    def test_tampered_token_raises(self) -> None:
        token = create_access_token("user-123")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_access_token_contains_type_claim(self) -> None:
        token = create_access_token("u1")
        payload = decode_token(token)
        assert payload["type"] == "access"
