"""Add file_size_bytes column to datasets table.

Revision ID: 006_add_file_size_to_datasets
Revises: 005_add_s3_key_to_datasets
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "006_add_file_size_to_datasets"
down_revision = "005_add_s3_key_to_datasets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "datasets",
        sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("datasets", "file_size_bytes")
