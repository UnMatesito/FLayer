"""make quantity_grams nullable (supply movements don't use grams)

Revision ID: 016
Revises: 015
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op

revision: str = '016'
down_revision: Union[str, None] = '015'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('stock_movements', 'quantity_grams', nullable=True)


def downgrade() -> None:
    op.alter_column('stock_movements', 'quantity_grams', nullable=False)
