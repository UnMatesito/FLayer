"""drop budget status, sent_to_client, sent_at columns

Revision ID: 010
Revises: 009
Create Date: 2026-07-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("budgets", "status")
    op.drop_column("budgets", "sent_to_client")
    op.drop_column("budgets", "sent_at")


def downgrade() -> None:
    op.add_column("budgets", sa.Column("status", sa.String(20), nullable=False, server_default="draft"))
    op.add_column("budgets", sa.Column("sent_to_client", sa.Boolean, nullable=False, server_default=sa.text("false")))
    op.add_column("budgets", sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True))
