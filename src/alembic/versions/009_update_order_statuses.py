"""rename in_progress→quoting, add printing status

Revision ID: 009
Revises: 008
Create Date: 2026-07-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("INSERT INTO order_statuses (id, name) VALUES (gen_random_uuid(), 'quoting')")
    op.execute("INSERT INTO order_statuses (id, name) VALUES (gen_random_uuid(), 'printing')")

    op.execute("UPDATE orders SET status = 'quoting' WHERE status = 'in_progress'")

    op.execute("DELETE FROM order_statuses WHERE name = 'in_progress'")


def downgrade() -> None:
    op.execute("INSERT INTO order_statuses (id, name) VALUES (gen_random_uuid(), 'in_progress')")

    op.execute("UPDATE orders SET status = 'in_progress' WHERE status = 'quoting'")

    op.execute("DELETE FROM order_statuses WHERE name = 'quoting'")
    op.execute("DELETE FROM order_statuses WHERE name = 'printing'")
