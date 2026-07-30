import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.product import FixedProduct
from backend.models.product_stock_movement import ProductStockMovement

logger = logging.getLogger(__name__)


class ProductStockService:

    @staticmethod
    async def deduct(
        db: AsyncSession,
        order_id: UUID,
        product_id: UUID,
        quantity: float,
        user_id: UUID,
    ) -> None:
        result = await db.execute(
            select(FixedProduct).where(
                FixedProduct.id == product_id,
                FixedProduct.user_id == user_id,
            )
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise ValueError(f"Product {product_id} not found")

        old_stock = float(product.stock_quantity)
        new_stock = old_stock - quantity
        product.stock_quantity = new_stock
        await db.flush()

        movement = ProductStockMovement(
            user_id=user_id,
            product_id=product_id,
            movement_type="consumption",
            quantity=-quantity,
            order_id=order_id,
            created_by_user_id=user_id,
        )
        db.add(movement)
        await db.flush()

        if new_stock < 0:
            logger.warning(
                "Stock went negative for product %s (order %s): "
                "required %.2f, available %.2f — oversell",
                product_id, order_id, quantity, old_stock,
            )

    @staticmethod
    async def reverse(
        db: AsyncSession,
        order_id: UUID,
        user_id: UUID,
    ) -> None:
        result = await db.execute(
            select(ProductStockMovement).where(
                ProductStockMovement.order_id == order_id,
                ProductStockMovement.movement_type == "consumption",
            )
        )
        movements = result.scalars().all()

        for movement in movements:
            product_result = await db.execute(
                select(FixedProduct).where(
                    FixedProduct.id == movement.product_id,
                    FixedProduct.user_id == user_id,
                )
            )
            product = product_result.scalar_one_or_none()
            if product is None:
                continue

            reversed_qty = abs(float(movement.quantity))
            product.stock_quantity = float(product.stock_quantity) + reversed_qty
            await db.flush()

            reversal = ProductStockMovement(
                user_id=user_id,
                product_id=movement.product_id,
                movement_type="reversal",
                quantity=reversed_qty,
                order_id=order_id,
                created_by_user_id=user_id,
            )
            db.add(reversal)
            await db.flush()

    @staticmethod
    async def adjust(
        db: AsyncSession,
        product_id: UUID,
        delta_quantity: float,
        user_id: UUID,
        notes: str | None = None,
    ) -> tuple[float, UUID]:
        result = await db.execute(
            select(FixedProduct).where(
                FixedProduct.id == product_id,
                FixedProduct.user_id == user_id,
            )
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise ValueError(f"Product {product_id} not found")

        product.stock_quantity = float(product.stock_quantity) + delta_quantity
        await db.flush()

        movement = ProductStockMovement(
            user_id=user_id,
            product_id=product_id,
            movement_type="adjustment",
            quantity=delta_quantity,
            created_by_user_id=user_id,
            notes=notes,
        )
        db.add(movement)
        await db.flush()

        return float(product.stock_quantity), movement.id


product_stock_service = ProductStockService()
