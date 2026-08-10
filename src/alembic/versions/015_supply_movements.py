"""stock_movements support supply movements

Revision ID: 015
Revises: 014
Create Date: 2026-08-08

- filament_id becomes nullable (a movement is either filament or supply based)
- adds supply_id, quantity, unit columns

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('stock_movements', 'filament_id', nullable=True)
    op.add_column('stock_movements', sa.Column('supply_id', postgresql.UUID(), nullable=True))
    op.add_column('stock_movements', sa.Column('quantity', sa.Numeric(10, 2), nullable=True))
    op.add_column('stock_movements', sa.Column('unit', sa.String(20), nullable=True))
    op.create_foreign_key(
        op.f('fk_stock_movements_supply_id_supplies'),
        'stock_movements',
        'supplies',
        ['supply_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f('fk_stock_movements_supply_id_supplies'),
        'stock_movements',
        type_='foreignkey',
    )
    op.drop_column('stock_movements', 'unit')
    op.drop_column('stock_movements', 'quantity')
    op.drop_column('stock_movements', 'supply_id')
    op.alter_column('stock_movements', 'filament_id', nullable=False)
