"""create filaments, stock_movements, supplies tables + orders columns

Revision ID: 004
Revises: 003
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "filaments",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("color_name", sa.String(100), nullable=False),
        sa.Column("color_hex", sa.String(7), nullable=False),
        sa.Column("filament_type", sa.String(50), nullable=False),
        sa.Column("weight_grams", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("price_per_kg", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("min_stock_warning_grams", sa.Numeric(10, 2), nullable=False, server_default="200"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "color_name", name="uq_filament_user_color"),
    )
    op.create_index("ix_filaments_user_active", "filaments", ["user_id", "is_active"])

    op.create_table(
        "supplies",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("unit", sa.String(30), nullable=False),
        sa.Column("min_stock_warning", sa.Numeric(10, 2), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_supplies_user_active", "supplies", ["user_id", "is_active"])

    op.create_table(
        "stock_movements",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filament_id", UUID, sa.ForeignKey("filaments.id"), nullable=False),
        sa.Column("movement_type", sa.String(20), nullable=False),
        sa.Column("quantity_grams", sa.Numeric(10, 2), nullable=False),
        sa.Column("order_id", UUID, sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("created_by_user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_stock_movements_filament",
        "stock_movements",
        ["user_id", "filament_id", sa.text("created_at DESC")],
    )
    op.create_index("ix_stock_movements_order", "stock_movements", ["order_id"])

    op.add_column(
        "orders",
        sa.Column("filament_id", UUID, sa.ForeignKey("filaments.id"), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("grams_estimated", sa.Numeric(10, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "grams_estimated")
    op.drop_column("orders", "filament_id")
    op.drop_index("ix_stock_movements_order", table_name="stock_movements")
    op.drop_index("ix_stock_movements_filament", table_name="stock_movements")
    op.drop_table("stock_movements")
    op.drop_index("ix_supplies_user_active", table_name="supplies")
    op.drop_table("supplies")
    op.drop_index("ix_filaments_user_active", table_name="filaments")
    op.drop_table("filaments")
