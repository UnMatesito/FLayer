"""add order category, print services, dimensions, delivery type and delivery-cost fields

Revision ID: 021
Revises: 020
Create Date: 2026-09-09

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("order_category", sa.String(20), nullable=False, server_default="print"),
    )
    op.add_column(
        "orders",
        sa.Column("needs_3d_printing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "orders",
        sa.Column("needs_3d_modelling", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("orders", sa.Column("dimensions", sa.Text(), nullable=True))
    op.add_column(
        "orders",
        sa.Column("type_of_delivery", sa.String(30), nullable=False, server_default="Presencial acordado"),
    )
    op.add_column("orders", sa.Column("delivery_embalaje", sa.Numeric(12, 2), nullable=True))
    op.add_column("orders", sa.Column("delivery_precio_envio", sa.Numeric(12, 2), nullable=True))

    op.execute("UPDATE orders SET needs_3d_printing = true WHERE work_type = 'impresion_3d'")
    op.execute("UPDATE orders SET needs_3d_modelling = true WHERE work_type = 'diseno_3d'")

    op.create_check_constraint(
        "ck_orders_order_category_valid",
        "orders",
        "order_category IN ('print', 'product')",
    )
    op.create_check_constraint(
        "ck_orders_delivery_type_valid",
        "orders",
        "type_of_delivery IN ('Presencial acordado', 'Delivery')",
    )
    op.create_check_constraint(
        "ck_orders_delivery_embalaje_non_negative",
        "orders",
        "delivery_embalaje >= 0",
    )
    op.create_check_constraint(
        "ck_orders_delivery_envio_non_negative",
        "orders",
        "delivery_precio_envio >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_orders_delivery_envio_non_negative", "orders", type_="check")
    op.drop_constraint("ck_orders_delivery_embalaje_non_negative", "orders", type_="check")
    op.drop_constraint("ck_orders_delivery_type_valid", "orders", type_="check")
    op.drop_constraint("ck_orders_order_category_valid", "orders", type_="check")

    op.drop_column("orders", "delivery_precio_envio")
    op.drop_column("orders", "delivery_embalaje")
    op.drop_column("orders", "type_of_delivery")
    op.drop_column("orders", "dimensions")
    op.drop_column("orders", "needs_3d_modelling")
    op.drop_column("orders", "needs_3d_printing")
    op.drop_column("orders", "order_category")