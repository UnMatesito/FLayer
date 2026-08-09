"""Idempotent migration: stock_movements now supports supply movements.

- filament_id becomes nullable (a movement is either filament or supply based)
- adds supply_id, quantity, unit columns

Usage: python -m backend.scripts.migrate_supply_movements
"""

import asyncio

from sqlalchemy import text

from backend.database import get_engine


async def migrate() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE stock_movements ALTER COLUMN filament_id DROP NOT NULL"))
        await conn.execute(text(
            "ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES supplies(id)"
        ))
        await conn.execute(text(
            "ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2)"
        ))
        await conn.execute(text(
            "ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit VARCHAR(20)"
        ))
    print("Migration OK: stock_movements supports supply movements")


if __name__ == "__main__":
    asyncio.run(migrate())
