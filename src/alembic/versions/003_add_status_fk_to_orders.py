"""add order_statuses FK to orders.status

Revision ID: 003
Revises: 002
Create Date: 2026-07-16

"""

from typing import Sequence, Union

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE orders SET status = 'ready' WHERE status = 'completed'")
    op.create_foreign_key(
        "fk_orders_status",
        "orders",
        "order_statuses",
        ["status"],
        ["name"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_orders_status", "orders", type_="foreignkey")
