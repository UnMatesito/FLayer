"""region parameters: add EUR, BRL, GBP, MXN currencies

Revision ID: 018
Revises: 017
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op

revision: str = '018'
down_revision: Union[str, None] = '017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CURRENCIES = "('ARS','USD','EUR','BRL','GBP','MXN')"


def upgrade() -> None:
    op.drop_constraint('ck_budget_parameters_currency', 'budget_parameters', type_='check')
    op.create_check_constraint(
        'ck_budget_parameters_currency',
        'budget_parameters',
        f'currency IN {CURRENCIES}',
    )
    op.drop_constraint('ck_users_currency', 'users', type_='check')
    op.create_check_constraint(
        'ck_users_currency',
        'users',
        f'currency IN {CURRENCIES}',
    )


def downgrade() -> None:
    op.drop_constraint('ck_users_currency', 'users', type_='check')
    op.create_check_constraint(
        'ck_users_currency',
        'users',
        "currency IN ('ARS','USD')",
    )
    op.drop_constraint('ck_budget_parameters_currency', 'budget_parameters', type_='check')
    op.create_check_constraint(
        'ck_budget_parameters_currency',
        'budget_parameters',
        "currency IN ('ARS','USD')",
    )