"""Add s3_key column to datasets table.

Revision ID: 005_add_s3_key_to_datasets
Revises: 004_modular_monolith
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "005_add_s3_key_to_datasets"
down_revision = "004_modular_monolith"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "datasets",
        sa.Column("s3_key", sa.String(1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("datasets", "s3_key")
