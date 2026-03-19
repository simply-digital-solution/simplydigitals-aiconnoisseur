"""Add client_ip to datasets table.

Revision ID: 002_add_client_ip
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "002_add_client_ip"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "datasets",
        sa.Column("client_ip", sa.String(45), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("datasets", "client_ip")
