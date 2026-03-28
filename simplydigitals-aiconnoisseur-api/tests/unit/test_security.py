"""Unit tests for app.core.security."""

from __future__ import annotations

import pytest
from app.shared.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from jose import JWTError

_PWD = "correct1!"
_WRONG = "wrongpass!"


class TestPasswordHashing:
    def test_hash_returns_non_plain_text(self) -> None:
        assert hash_password(_PWD) != _PWD

    def test_verify_correct_password(self) -> None:
        assert verify_password(_PWD, hash_password(_PWD)) is True

    def test_verify_wrong_password(self) -> None:
        assert verify_password(_WRONG, hash_password(_PWD)) is False

    def test_two_hashes_of_same_password_differ(self) -> None:
        assert hash_password(_PWD) != hash_password(_PWD)


class TestJWT:
    def test_access_token_encodes_subject(self) -> None:
        token = create_access_token("user-123")
        assert decode_token(token, expected_type="access")["sub"] == "user-123"

    def test_refresh_token_encodes_subject(self) -> None:
        token = create_refresh_token("user-456")
        assert decode_token(token, expected_type="refresh")["sub"] == "user-456"

    def test_wrong_token_type_raises(self) -> None:
        with pytest.raises(JWTError):
            decode_token(create_access_token("u"), expected_type="refresh")

    def test_tampered_token_raises(self) -> None:
        with pytest.raises(JWTError):
            decode_token(create_access_token("u")[:-5] + "XXXXX")

    def test_access_token_contains_type_claim(self) -> None:
        assert decode_token(create_access_token("u1"))["type"] == "access"
