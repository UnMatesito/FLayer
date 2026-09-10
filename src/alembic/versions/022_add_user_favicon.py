"""add favicon_path column to users

Revision ID: 022
Revises: 021
Create Date: 2026-09-10

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("favicon_path", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "favicon_path")