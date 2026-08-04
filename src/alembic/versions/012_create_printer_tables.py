"""create printers and printer_maintenance tables

Revision ID: 012
Revises: 46ac01109cd2
Create Date: 2026-07-31

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "012"
down_revision: Union[str, None] = "46ac01109cd2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "printers",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("brand", sa.String(100), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("nozzle_sizes", JSONB, nullable=False, server_default="[]"),
        sa.Column("power_watts", sa.Numeric(7, 2), nullable=True),
        sa.Column("lifespan_hours", sa.Numeric(10, 2), nullable=True),
        sa.Column("spare_parts_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("power_watts >= 0", name="ck_printers_power_watts_non_negative"),
        sa.CheckConstraint("lifespan_hours >= 0", name="ck_printers_lifespan_hours_non_negative"),
        sa.CheckConstraint("spare_parts_cost >= 0", name="ck_printers_spare_parts_cost_non_negative"),
    )
    op.create_index("ix_printers_user_active", "printers", ["user_id", "is_active"])
    op.create_index(
        "uq_printers_user_name_active",
        "printers",
        ["user_id", sa.text("lower(name)")],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )

    op.create_table(
        "printer_maintenance",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("printer_id", UUID, sa.ForeignKey("printers.id"), nullable=False),
        sa.Column("maintenance_type", sa.String(20), nullable=False),
        sa.Column("maintenance_date", sa.Date, nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("cost >= 0", name="ck_printer_maintenance_cost_non_negative"),
    )
    op.create_index(
        "ix_printer_maintenance_user_printer_date",
        "printer_maintenance",
        ["user_id", "printer_id", sa.text("maintenance_date DESC")],
    )
    op.create_index("ix_printer_maintenance_printer", "printer_maintenance", ["printer_id"])


def downgrade() -> None:
    op.drop_index("ix_printer_maintenance_printer", table_name="printer_maintenance")
    op.drop_index("ix_printer_maintenance_user_printer_date", table_name="printer_maintenance")
    op.drop_table("printer_maintenance")
    op.drop_index("uq_printers_user_name_active", table_name="printers")
    op.drop_index("ix_printers_user_active", table_name="printers")
    op.drop_table("printers")
