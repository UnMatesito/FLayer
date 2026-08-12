"""add business_name column to users

Revision ID: 019
Revises: 018
Create Date: 2026-08-12

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("business_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "business_name")