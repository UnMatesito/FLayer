"""budget margin presets and post-processing costs

Revision ID: 020
Revises: 019
Create Date: 2026-09-09

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "budgets",
        sa.Column("assembly_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "budgets",
        sa.Column("sanding_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "budgets",
        sa.Column("painting_cost", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_check_constraint(
        "ck_budgets_assembly_cost_non_negative",
        "budgets",
        "assembly_cost >= 0",
    )
    op.create_check_constraint(
        "ck_budgets_sanding_cost_non_negative",
        "budgets",
        "sanding_cost >= 0",
    )
    op.create_check_constraint(
        "ck_budgets_painting_cost_non_negative",
        "budgets",
        "painting_cost >= 0",
    )

    op.drop_constraint("ck_budget_parameters_wholesale_range", "budget_parameters", type_="check")
    op.drop_constraint("ck_budget_parameters_retail_range", "budget_parameters", type_="check")
    op.drop_constraint("ck_budget_parameters_keychain_range", "budget_parameters", type_="check")
    op.drop_column("budget_parameters", "margin_multiplier_wholesale")
    op.drop_column("budget_parameters", "margin_multiplier_retail")
    op.drop_column("budget_parameters", "margin_multiplier_keychain")


def downgrade() -> None:
    op.add_column(
        "budget_parameters",
        sa.Column("margin_multiplier_keychain", sa.Numeric(5, 2), nullable=False, server_default="5"),
    )
    op.add_column(
        "budget_parameters",
        sa.Column("margin_multiplier_retail", sa.Numeric(5, 2), nullable=False, server_default="4"),
    )
    op.add_column(
        "budget_parameters",
        sa.Column("margin_multiplier_wholesale", sa.Numeric(5, 2), nullable=False, server_default="3"),
    )
    op.create_check_constraint(
        "ck_budget_parameters_keychain_range",
        "budget_parameters",
        "margin_multiplier_keychain > 0 AND margin_multiplier_keychain <= 100",
    )
    op.create_check_constraint(
        "ck_budget_parameters_retail_range",
        "budget_parameters",
        "margin_multiplier_retail > 0 AND margin_multiplier_retail <= 100",
    )
    op.create_check_constraint(
        "ck_budget_parameters_wholesale_range",
        "budget_parameters",
        "margin_multiplier_wholesale > 0 AND margin_multiplier_wholesale <= 100",
    )

    op.drop_constraint("ck_budgets_painting_cost_non_negative", "budgets", type_="check")
    op.drop_constraint("ck_budgets_sanding_cost_non_negative", "budgets", type_="check")
    op.drop_constraint("ck_budgets_assembly_cost_non_negative", "budgets", type_="check")
    op.drop_column("budgets", "painting_cost")
    op.drop_column("budgets", "sanding_cost")
    op.drop_column("budgets", "assembly_cost")
