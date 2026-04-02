"""S3 storage service — optional, used when S3_BUCKET_NAME is set.

When S3_BUCKET_NAME is empty (dev / test) all operations are no-ops and
callers fall back to local-disk storage.  boto3 is intentionally imported
lazily so the test suite does not require it to be installed.
"""

from __future__ import annotations

import io

import pandas as pd

from app.shared.config import get_settings
from app.shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def is_enabled() -> bool:
    """Return True when an S3 bucket is configured."""
    return bool(settings.S3_BUCKET_NAME)


def _client():  # type: ignore[return]
    import boto3  # noqa: PLC0415 — lazy import keeps tests boto3-free

    return boto3.client("s3", region_name=settings.AWS_REGION)


def upload_csv(key: str, content: bytes) -> None:
    """Upload raw CSV bytes to S3."""
    _client().put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType="text/csv",
    )
    logger.info("s3_upload", key=key, bucket=settings.S3_BUCKET_NAME)


def delete_object(key: str) -> None:
    """Delete an object from S3.  Safe to call with an empty key."""
    if not key:
        return
    _client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    logger.info("s3_delete", key=key)


def load_dataframe(key: str) -> pd.DataFrame:
    """Download a CSV from S3 and return a DataFrame."""
    response = _client().get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    return pd.read_csv(io.BytesIO(response["Body"].read()))
