"""update filament unique constraint to include brand, make brand not null

Revision ID: 006
Revises: 005
Create Date: 2026-07-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_filament_user_color", "filaments", type_="unique")
    op.execute("UPDATE filaments SET brand = '' WHERE brand IS NULL")
    op.alter_column("filaments", "brand", nullable=False, server_default="")
    op.create_unique_constraint(
        "uq_filament_user_color_brand",
        "filaments",
        ["user_id", "color_name", "brand"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_filament_user_color_brand", "filaments", type_="unique")
    op.alter_column("filaments", "brand", nullable=True, server_default=None)
    op.execute("UPDATE filaments SET brand = NULL WHERE brand = ''")
    op.create_unique_constraint(
        "uq_filament_user_color",
        "filaments",
        ["user_id", "color_name"],
    )
