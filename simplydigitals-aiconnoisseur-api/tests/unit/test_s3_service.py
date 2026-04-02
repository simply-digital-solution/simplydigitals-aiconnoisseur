"""Unit tests for app.shared.s3_service — all S3 calls are mocked."""

from __future__ import annotations

import io
from unittest.mock import MagicMock

import app.shared.s3_service as s3
import pandas as pd
import pytest


@pytest.fixture(autouse=True)
def _enable_s3(monkeypatch: pytest.MonkeyPatch) -> None:
    """Simulate a configured S3 bucket for every test in this module."""
    monkeypatch.setattr(s3.settings, "S3_BUCKET_NAME", "test-bucket")
    monkeypatch.setattr(s3.settings, "AWS_REGION", "ap-southeast-2")


@pytest.fixture
def mock_s3_client(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Replace _client() with a MagicMock so no boto3 import is needed."""
    client = MagicMock()
    monkeypatch.setattr(s3, "_client", lambda: client)
    return client


class TestIsEnabled:
    def test_returns_true_when_bucket_set(self) -> None:
        assert s3.is_enabled() is True

    def test_returns_false_when_bucket_empty(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(s3.settings, "S3_BUCKET_NAME", "")
        assert s3.is_enabled() is False


class TestUploadCsv:
    def test_calls_put_object_with_correct_args(self, mock_s3_client: MagicMock) -> None:
        s3.upload_csv("datasets/user1/file.csv", b"a,b\n1,2")
        mock_s3_client.put_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="datasets/user1/file.csv",
            Body=b"a,b\n1,2",
            ContentType="text/csv",
        )

    def test_uses_configured_bucket(self, mock_s3_client: MagicMock) -> None:
        s3.upload_csv("key", b"data")
        call_kwargs = mock_s3_client.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "test-bucket"


class TestDeleteObject:
    def test_calls_delete_object(self, mock_s3_client: MagicMock) -> None:
        s3.delete_object("datasets/user1/file.csv")
        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="datasets/user1/file.csv",
        )

    def test_noop_on_empty_key(self, mock_s3_client: MagicMock) -> None:
        s3.delete_object("")
        mock_s3_client.delete_object.assert_not_called()

    def test_noop_on_none_key(self, mock_s3_client: MagicMock) -> None:
        s3.delete_object(None)  # type: ignore[arg-type]
        mock_s3_client.delete_object.assert_not_called()


class TestLoadDataframe:
    def test_returns_dataframe_from_s3(self, mock_s3_client: MagicMock) -> None:
        csv_bytes = b"col_a,col_b\n1,2\n3,4"
        mock_s3_client.get_object.return_value = {"Body": io.BytesIO(csv_bytes)}

        df = s3.load_dataframe("datasets/user1/file.csv")

        assert isinstance(df, pd.DataFrame)
        assert list(df.columns) == ["col_a", "col_b"]
        assert len(df) == 2

    def test_get_object_called_with_correct_args(self, mock_s3_client: MagicMock) -> None:
        mock_s3_client.get_object.return_value = {"Body": io.BytesIO(b"x\n1")}

        s3.load_dataframe("some/key.csv")

        mock_s3_client.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="some/key.csv",
        )
