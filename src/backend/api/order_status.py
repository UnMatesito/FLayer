import logging

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.customer import Customer
from backend.models.filament import Filament
from backend.models.order import Order
from backend.models.order_status import OrderStatus
from backend.models.user import User
from backend.schemas.order import OrderDetailResponse
from backend.schemas.order_status import (
    OrderStatusResponse,
    StatusUpdateRequest,
    StatusUpdateResponse,
    VALID_TRANSITIONS,
)
from backend.services.email_service import email_service
from backend.services.stock_service import stock_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/orders/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    result = await db.execute(
        select(Customer).where(Customer.id == order.customer_id)
    )
    customer = result.scalar_one_or_none()

    order.customer_name = customer.name if customer else ""
    order.customer_email = customer.email if customer else ""
    return order


@router.patch("/api/orders/{order_id}/status", response_model=StatusUpdateResponse)
async def update_order_status(
    order_id: UUID,
    body: StatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    current_status = order.status
    new_status = body.status

    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. "
                   f"Valid targets: {', '.join(sorted(allowed)) if allowed else 'none (terminal state)'}",
        )

    if new_status == "ready":
        filament_id = body.filament_id or order.filament_id
        grams = body.grams or order.grams_estimated

        if filament_id is not None and grams is not None:
            filament_result = await db.execute(
                select(Filament).where(
                    Filament.id == filament_id,
                    Filament.user_id == current_user.id,
                )
            )
            filament = filament_result.scalar_one_or_none()
            if filament is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Filament not found",
                )

            if float(filament.weight_grams) < grams:
                logger.warning(
                    "Insufficient stock for order %s: required %.2fg, available %.2fg",
                    order_id, grams, float(filament.weight_grams),
                )

            if body.filament_id is not None:
                order.filament_id = filament_id
            if body.grams is not None:
                order.grams_estimated = grams

            await stock_service.deduct(
                db=db,
                order_id=order_id,
                filament_id=filament_id,
                grams=grams,
                user_id=current_user.id,
            )

    if new_status == "cancelled":
        if current_status == "ready":
            await stock_service.reverse(
                db=db,
                order_id=order_id,
                user_id=current_user.id,
            )

    order.status = new_status
    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Customer).where(Customer.id == order.customer_id)
    )
    customer = result.scalar_one_or_none()
    if customer:
        await email_service.send_order_status_change(order, new_status, customer.email)

    return order


@router.get("/api/order-statuses", response_model=list[OrderStatusResponse])
async def list_order_statuses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[OrderStatus]:
    result = await db.execute(select(OrderStatus))
    return list(result.scalars().all())
