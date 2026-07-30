"""create fixed_products table, add fixed_product_id and total to orders

Revision ID: 011
Revises: 010
Create Date: 2026-07-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fixed_products",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.add_column(
        "orders",
        sa.Column("fixed_product_id", UUID, sa.ForeignKey("fixed_products.id"), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("total", sa.Numeric(12, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("orders", "total")
    op.drop_column("orders", "fixed_product_id")
    op.drop_table("fixed_products")
