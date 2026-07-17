"""add brand and settings columns to filaments

Revision ID: 005
Revises: 004
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "filaments",
        sa.Column("brand", sa.String(100), nullable=True),
    )
    op.add_column(
        "filaments",
        sa.Column("settings", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("filaments", "settings")
    op.drop_column("filaments", "brand")
