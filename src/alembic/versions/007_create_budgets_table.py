"""create budgets table

Revision ID: 007
Revises: 006
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("order_id", UUID, sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="ARS"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("filament_items", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("manual_filament_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("hours", sa.Integer, nullable=False, server_default="0"),
        sa.Column("minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("extra_costs", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("margin_type", sa.String(20), nullable=False, server_default="retail"),
        sa.Column("error_margin_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("margin_multiplier", sa.Numeric(5, 2), nullable=False),
        sa.Column("final_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("manual_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("sent_to_client", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("order_id", "version", name="uq_budget_order_version"),
    )


def downgrade() -> None:
    op.drop_table("budgets")
