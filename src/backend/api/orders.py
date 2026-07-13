from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.customer import Customer
from backend.models.order import Order
from backend.models.user import User
from backend.schemas.order import OrderCreate, OrderResponse, PublicOrderCreate
from backend.services.email_service import email_service

router = APIRouter()


@router.post("/api/public/orders", response_model=OrderResponse, status_code=201)
async def create_public_order(
    body: PublicOrderCreate,
    db: AsyncSession = Depends(get_db),
) -> Order:
    if not body.work_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="work_type is required",
        )

    user_id = UUID("00000000-0000-0000-0000-000000000001")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=user_id,
            email="anonymous@flayer.com",
            name="Anonymous",
            hashed_password="",
        )
        db.add(user)
        await db.flush()

    result = await db.execute(
        select(Customer).where(
            Customer.email == body.customer.email,
            Customer.user_id == user_id,
        )
    )
    customer = result.scalar_one_or_none()
    if customer is None:
        customer = Customer(
            user_id=user_id,
            name=body.customer.name,
            email=body.customer.email,
            phone=body.customer.phone,
        )
        db.add(customer)
        await db.flush()

    files_data = [f.model_dump() for f in body.files] if body.files else None

    order = Order(
        user_id=user_id,
        customer_id=customer.id,
        work_type=body.work_type,
        description=body.description,
        files=files_data,
        status="new",
        client_notified=not body.skip_client_notification,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if not body.skip_client_notification:
        await email_service.send_order_received(order, customer.email)

    return order


@router.post("/api/orders", response_model=OrderResponse, status_code=201)
async def create_internal_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    result = await db.execute(
        select(Customer).where(
            Customer.email == body.customer.email,
            Customer.user_id == current_user.id,
        )
    )
    customer = result.scalar_one_or_none()
    if customer is None:
        customer = Customer(
            user_id=current_user.id,
            name=body.customer.name,
            email=body.customer.email,
            phone=body.customer.phone,
        )
        db.add(customer)
        await db.flush()

    files_data = [f.model_dump() for f in body.files] if body.files else None

    status_val = body.status if body.status else "new"

    order = Order(
        user_id=current_user.id,
        customer_id=customer.id,
        work_type=body.work_type,
        description=body.description,
        files=files_data,
        status=status_val,
        client_notified=not body.skip_client_notification,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    if not body.skip_client_notification:
        await email_service.send_order_received(order, customer.email)

    return order


@router.get("/api/orders", response_model=list[OrderResponse])
async def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Order]:
    query = select(Order).where(Order.user_id == current_user.id)

    if status_filter == "active":
        query = query.where(Order.status == "new")

    query = query.order_by(Order.created_at.desc())

    result = await db.execute(query)
    orders = result.scalars().all()
    return list(orders)
