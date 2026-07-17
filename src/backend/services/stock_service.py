import logging
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.filament import Filament
from backend.models.stock_movement import StockMovement

logger = logging.getLogger(__name__)


class StockService:

    @staticmethod
    async def deduct(
        db: AsyncSession,
        order_id: UUID,
        filament_id: UUID,
        grams: float,
        user_id: UUID,
    ) -> None:
        result = await db.execute(
            select(Filament).where(
                Filament.id == filament_id,
                Filament.user_id == user_id,
            )
        )
        filament = result.scalar_one_or_none()
        if filament is None:
            raise ValueError(f"Filament {filament_id} not found")

        old_weight = float(filament.weight_grams)
        new_weight = old_weight - grams
        filament.weight_grams = new_weight
        await db.flush()

        movement = StockMovement(
            user_id=user_id,
            filament_id=filament_id,
            movement_type="consumption",
            quantity_grams=-grams,
            order_id=order_id,
            created_by_user_id=user_id,
        )
        db.add(movement)
        await db.flush()

        if new_weight < 0:
            logger.warning(
                "Stock went negative for filament %s (order %s): "
                "required %.2fg, available %.2fg — oversell",
                filament_id, order_id, grams, old_weight,
            )

    @staticmethod
    async def reverse(
        db: AsyncSession,
        order_id: UUID,
        user_id: UUID,
    ) -> None:
        result = await db.execute(
            select(StockMovement).where(
                StockMovement.order_id == order_id,
                StockMovement.movement_type == "consumption",
            )
        )
        movements = result.scalars().all()

        for movement in movements:
            filament_result = await db.execute(
                select(Filament).where(
                    Filament.id == movement.filament_id,
                    Filament.user_id == user_id,
                )
            )
            filament = filament_result.scalar_one_or_none()
            if filament is None:
                continue

            reversed_grams = abs(float(movement.quantity_grams))
            filament.weight_grams = float(filament.weight_grams) + reversed_grams
            await db.flush()

            reversal = StockMovement(
                user_id=user_id,
                filament_id=movement.filament_id,
                movement_type="reversal",
                quantity_grams=reversed_grams,
                order_id=order_id,
                created_by_user_id=user_id,
            )
            db.add(reversal)
            await db.flush()

    @staticmethod
    async def adjust(
        db: AsyncSession,
        filament_id: UUID,
        delta_grams: float,
        user_id: UUID,
        notes: str | None = None,
    ) -> tuple[float, UUID]:
        result = await db.execute(
            select(Filament).where(
                Filament.id == filament_id,
                Filament.user_id == user_id,
            )
        )
        filament = result.scalar_one_or_none()
        if filament is None:
            raise ValueError(f"Filament {filament_id} not found")

        filament.weight_grams = float(filament.weight_grams) + delta_grams
        await db.flush()

        movement = StockMovement(
            user_id=user_id,
            filament_id=filament_id,
            movement_type="adjustment",
            quantity_grams=delta_grams,
            created_by_user_id=user_id,
            notes=notes,
        )
        db.add(movement)
        await db.flush()

        return float(filament.weight_grams), movement.id


stock_service = StockService()
