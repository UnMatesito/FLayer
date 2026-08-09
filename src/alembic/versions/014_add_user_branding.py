"""add branding columns to users

Revision ID: 014
Revises: 013
Create Date: 2026-08-04

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("primary_color", sa.String(7), nullable=True))
    op.add_column("users", sa.Column("logo_path", sa.String(500), nullable=True))
    op.create_check_constraint(
        "ck_users_primary_color_hex",
        "users",
        "primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$'",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_primary_color_hex", "users", type_="check")
    op.drop_column("users", "logo_path")
    op.drop_column("users", "primary_color")
