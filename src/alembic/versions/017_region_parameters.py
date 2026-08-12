"""region parameters: budget_parameters table, users.currency, budgets.electricity_price_kwh

Revision ID: 017
Revises: 016
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '017'
down_revision: Union[str, None] = '016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'budget_parameters',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False),
        sa.Column('electricity_price_kwh', sa.Numeric(12, 2), nullable=False),
        sa.Column('error_margin_percent', sa.Numeric(5, 2), nullable=False),
        sa.Column('margin_multiplier_wholesale', sa.Numeric(5, 2), nullable=False),
        sa.Column('margin_multiplier_retail', sa.Numeric(5, 2), nullable=False),
        sa.Column('margin_multiplier_keychain', sa.Numeric(5, 2), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'currency', name='uq_budget_parameters_user_currency'),
        sa.CheckConstraint("currency IN ('ARS','USD')", name='ck_budget_parameters_currency'),
        sa.CheckConstraint('electricity_price_kwh > 0', name='ck_budget_parameters_electricity_positive'),
        sa.CheckConstraint(
            'error_margin_percent >= 0 AND error_margin_percent <= 100',
            name='ck_budget_parameters_error_margin_range',
        ),
        sa.CheckConstraint(
            'margin_multiplier_wholesale > 0 AND margin_multiplier_wholesale <= 100',
            name='ck_budget_parameters_wholesale_range',
        ),
        sa.CheckConstraint(
            'margin_multiplier_retail > 0 AND margin_multiplier_retail <= 100',
            name='ck_budget_parameters_retail_range',
        ),
        sa.CheckConstraint(
            'margin_multiplier_keychain > 0 AND margin_multiplier_keychain <= 100',
            name='ck_budget_parameters_keychain_range',
        ),
    )
    op.add_column('users', sa.Column('currency', sa.String(3), server_default='ARS', nullable=False))
    op.create_check_constraint(
        "ck_users_currency",
        'users',
        "currency IN ('ARS','USD')",
    )
    op.add_column('budgets', sa.Column('electricity_price_kwh', sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('budgets', 'electricity_price_kwh')
    op.drop_constraint('ck_users_currency', 'users', type_='check')
    op.drop_column('users', 'currency')
    op.drop_table('budget_parameters')
