"""Modular monolith refactor — structural migration.

No schema changes in this migration. The ORM models were moved from:
  app/models/models.py  →  app/modules/auth/models.py
                            app/modules/datasets/models.py
                            app/modules/models/models.py

The database tables (users, datasets, ml_models) are identical.
This migration exists as a checkpoint to document the refactor
and to keep the Alembic revision chain continuous.

Revision ID: 004_modular_monolith
Revises: 003_oauth_fields
"""

from __future__ import annotations

revision = "004_modular_monolith"
down_revision = "003_oauth_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No schema changes — this is a structural/code refactor only.
    # Tables, columns, and indexes are unchanged.
    pass


def downgrade() -> None:
    pass
