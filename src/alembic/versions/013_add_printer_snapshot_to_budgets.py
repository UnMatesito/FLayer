"""add printer_id and machine parameter snapshot to budgets

Revision ID: 013
Revises: 012
Create Date: 2026-07-31

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("budgets", sa.Column("printer_id", UUID, nullable=True))
    op.create_foreign_key(
        "fk_budgets_printer_id_printers",
        "budgets",
        "printers",
        ["printer_id"],
        ["id"],
    )
    op.create_index("ix_budgets_printer_id", "budgets", ["printer_id"])

    op.add_column("budgets", sa.Column("power_watts", sa.Numeric(7, 2), nullable=True))
    op.add_column("budgets", sa.Column("lifespan_hours", sa.Numeric(10, 2), nullable=True))
    op.add_column("budgets", sa.Column("spare_parts_cost", sa.Numeric(12, 2), nullable=True))

    op.create_check_constraint(
        "ck_budgets_power_watts_non_negative",
        "budgets",
        "power_watts >= 0",
    )
    op.create_check_constraint(
        "ck_budgets_lifespan_hours_non_negative",
        "budgets",
        "lifespan_hours >= 0",
    )
    op.create_check_constraint(
        "ck_budgets_spare_parts_cost_non_negative",
        "budgets",
        "spare_parts_cost >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_budgets_spare_parts_cost_non_negative", "budgets", type_="check")
    op.drop_constraint("ck_budgets_lifespan_hours_non_negative", "budgets", type_="check")
    op.drop_constraint("ck_budgets_power_watts_non_negative", "budgets", type_="check")

    op.drop_column("budgets", "spare_parts_cost")
    op.drop_column("budgets", "lifespan_hours")
    op.drop_column("budgets", "power_watts")

    op.drop_index("ix_budgets_printer_id", table_name="budgets")
    op.drop_constraint("fk_budgets_printer_id_printers", "budgets", type_="foreignkey")
    op.drop_column("budgets", "printer_id")
