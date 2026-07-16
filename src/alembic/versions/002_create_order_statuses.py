"""create order_statuses lookup table

Revision ID: 002
Revises: 001
Create Date: 2026-07-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS order_statuses (
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            name VARCHAR(50) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE (name)
        )
    """)

    op.execute("""
        INSERT INTO order_statuses (id, name)
        SELECT gen_random_uuid(), v
        FROM unnest(ARRAY['new', 'in_progress', 'ready', 'delivered', 'cancelled']) AS v
        WHERE NOT EXISTS (
            SELECT 1 FROM order_statuses
        )
    """)


def downgrade() -> None:
    op.drop_table("order_statuses")
