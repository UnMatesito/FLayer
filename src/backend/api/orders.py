from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.api.public_store import resolve_user_id_from_token as _resolve_user_id_from_token
from backend.database import get_db
from backend.models.budget import Budget
from backend.models.customer import Customer
from backend.models.order import Order
from backend.models.product import FixedProduct
from backend.models.user import User
from backend.schemas.order import (
    DeliveryCostUpdate,
    OrderCreate,
    OrderDetailResponse,
    OrderResponse,
    PublicOrderCreate,
)
from backend.services.email_service import email_service

router = APIRouter()


async def _validate_line_items(
    db: AsyncSession,
    line_items_data: list[dict],
    user_id: UUID | None,
    user_filter: bool = False,
) -> tuple[float, list[dict]]:
    calculated = 0.0
    for item in line_items_data:
        query = select(FixedProduct).where(
            FixedProduct.id == UUID(item["product_id"]),
            FixedProduct.is_active.is_(True),
        )
        if user_filter and user_id is not None:
            query = query.where(FixedProduct.user_id == user_id)
        result = await db.execute(query)
        product = result.scalar_one_or_none()
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{item['name']}' not found",
            )
        if float(product.stock_quantity) < item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product '{product.name}' has insufficient stock "
                       f"(requested {item['quantity']}, available {float(product.stock_quantity)})",
            )
        item["unit_price"] = float(product.price)
        calculated += item["quantity"] * float(product.price)
    return calculated, line_items_data


async def _validate_fixed_product(
    db: AsyncSession,
    fixed_product_id: UUID,
    user_id: UUID | None,
    user_filter: bool = False,
) -> float:
    query = select(FixedProduct).where(
        FixedProduct.id == fixed_product_id,
        FixedProduct.is_active.is_(True),
    )
    if user_filter and user_id is not None:
        query = query.where(FixedProduct.user_id == user_id)
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fixed product not found or inactive",
        )
    if float(product.stock_quantity) < 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product '{product.name}' is out of stock",
        )
    return float(product.price)


async def _get_or_create_customer(
    db: AsyncSession,
    user_id: UUID,
    name: str,
    email: str,
    phone: str | None,
) -> Customer:
    result = await db.execute(
        select(Customer).where(
            Customer.email == email,
            Customer.user_id == user_id,
        )
    )
    customer = result.scalar_one_or_none()
    if customer is None:
        customer = Customer(
            user_id=user_id,
            name=name,
            email=email,
            phone=phone,
        )
        db.add(customer)
        await db.flush()
    return customer


async def _create_order_record(
    db: AsyncSession,
    user_id: UUID,
    customer_id: UUID,
    work_type: str,
    description: str,
    files_data: list[dict] | None,
    status: str,
    client_notified: bool,
    fixed_product_id: UUID | None,
    line_items_data: list[dict] | None,
    total: float | None,
    order_category: str,
    needs_3d_printing: bool,
    needs_3d_modelling: bool,
    dimensions: str | None,
    type_of_delivery: str,
) -> Order:
    order = Order(
        user_id=user_id,
        customer_id=customer_id,
        work_type=work_type,
        description=description,
        files=files_data,
        status=status,
        client_notified=client_notified,
        fixed_product_id=fixed_product_id,
        line_items=line_items_data,
        total=total,
        order_category=order_category,
        needs_3d_printing=needs_3d_printing,
        needs_3d_modelling=needs_3d_modelling,
        dimensions=dimensions,
        type_of_delivery=type_of_delivery,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def _resolve_line_items_and_total(
    db: AsyncSession,
    line_items_data: list[dict] | None,
    fixed_product_id: UUID | None,
    total: float | None,
    user_id: UUID | None = None,
    user_filter: bool = False,
) -> tuple[list[dict] | None, float | None]:
    """Validate line items and/or fixed product, compute total if not provided."""
    if line_items_data:
        calculated, line_items_data = await _validate_line_items(db, line_items_data, user_id, user_filter)
        if total is None:
            total = calculated

    if fixed_product_id is not None and not line_items_data:
        price = await _validate_fixed_product(db, fixed_product_id, user_id, user_filter)
        if total is None:
            total = price

    return line_items_data, total


@router.post("/api/public/orders", response_model=OrderResponse, status_code=201)
async def create_public_order(
    body: PublicOrderCreate,
    db: AsyncSession = Depends(get_db),
) -> Order:
    if not body.work_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="work_type is required",
        )

    user_id = await _resolve_user_id_from_token(body.token, db)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid store token",
        )

    customer = await _get_or_create_customer(
        db, user_id, body.customer.name, body.customer.email, body.customer.phone
    )

    files_data = [f.model_dump() for f in body.files] if body.files else None
    line_items_data = [item.model_dump() for item in body.line_items] if body.line_items else None

    line_items_data, total = await _resolve_line_items_and_total(
        db, line_items_data, body.fixed_product_id, body.total
    )

    order = await _create_order_record(
        db=db,
        user_id=user_id,
        customer_id=customer.id,
        work_type=body.work_type,
        description=body.description,
        files_data=files_data,
        status="new",
        client_notified=not body.skip_client_notification,
        fixed_product_id=body.fixed_product_id,
        line_items_data=line_items_data,
        total=total,
        order_category=body.order_category,
        needs_3d_printing=body.needs_3d_printing,
        needs_3d_modelling=body.needs_3d_modelling,
        dimensions=body.dimensions,
        type_of_delivery=body.type_of_delivery,
    )

    if not body.skip_client_notification:
        await email_service.send_order_received(order, customer.email)

    return order


@router.post("/api/orders", response_model=OrderResponse, status_code=201)
async def create_internal_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    customer = await _get_or_create_customer(
        db, current_user.id, body.customer.name, body.customer.email, body.customer.phone
    )

    files_data = [f.model_dump() for f in body.files] if body.files else None
    line_items_data = [item.model_dump() for item in body.line_items] if body.line_items else None

    line_items_data, total = await _resolve_line_items_and_total(
        db, line_items_data, body.fixed_product_id, body.total,
        user_id=current_user.id, user_filter=True,
    )

    order = await _create_order_record(
        db=db,
        user_id=current_user.id,
        customer_id=customer.id,
        work_type=body.work_type,
        description=body.description,
        files_data=files_data,
        status=body.status or "new",
        client_notified=not body.skip_client_notification,
        fixed_product_id=body.fixed_product_id,
        line_items_data=line_items_data,
        total=total,
        order_category=body.order_category,
        needs_3d_printing=body.needs_3d_printing,
        needs_3d_modelling=body.needs_3d_modelling,
        dimensions=body.dimensions,
        type_of_delivery=body.type_of_delivery,
    )

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

    order_ids = [o.id for o in orders]
    if order_ids:
        budget_result = await db.execute(
            select(Budget.order_id).where(Budget.order_id.in_(order_ids)).distinct()
        )
        order_ids_with_budget = {row[0] for row in budget_result.fetchall()}
        customer_result = await db.execute(
            select(Customer.id, Customer.name).where(
                Customer.id.in_([o.customer_id for o in orders])
            )
        )
        customer_names = {row[0]: row[1] for row in customer_result.fetchall()}
    else:
        order_ids_with_budget = set()
        customer_names = {}

    for order in orders:
        order.has_budget = order.id in order_ids_with_budget
        order.customer_name = customer_names.get(order.customer_id)

    return list(orders)


@router.patch("/api/orders/{order_id}/delivery-cost", response_model=OrderDetailResponse)
async def update_delivery_cost(
    order_id: UUID,
    body: DeliveryCostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.type_of_delivery != "Delivery":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery cost can only be set for orders with type_of_delivery 'Delivery'",
        )

    order.delivery_embalaje = body.embalaje
    order.delivery_precio_envio = body.precio_envio
    await db.commit()
    await db.refresh(order)

    result = await db.execute(
        select(Customer).where(Customer.id == order.customer_id)
    )
    customer = result.scalar_one_or_none()
    order.customer_name = customer.name if customer else ""
    order.customer_email = customer.email if customer else ""
    return order
