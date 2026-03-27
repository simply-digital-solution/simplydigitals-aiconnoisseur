"""Add OAuth fields to users table.

Revision ID: 003_oauth_fields
Revises: 002_add_client_ip
Create Date: 2024-01-03 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "003_oauth_fields"
down_revision = "002_add_client_ip"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make hashed_password nullable — OAuth users have no password
    op.alter_column("users", "hashed_password", nullable=True)

    op.add_column("users", sa.Column("avatar_url", sa.String(512), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            sa.Enum("local", "google", "facebook", name="authprovider"),
            nullable=False,
            server_default="local",
        ),
    )
    op.add_column("users", sa.Column("oauth_provider_id", sa.String(255), nullable=True))
    op.create_index("ix_users_oauth_provider_id", "users", ["oauth_provider_id"])


def downgrade() -> None:
    op.drop_index("ix_users_oauth_provider_id", "users")
    op.drop_column("users", "oauth_provider_id")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "avatar_url")
    op.alter_column("users", "hashed_password", nullable=False)
    op.execute("DROP TYPE IF EXISTS authprovider")
