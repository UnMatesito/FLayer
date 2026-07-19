import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.budget import Budget
from backend.models.order import Order
from backend.models.user import User
from backend.schemas.budget import (
    BudgetCreate,
    BudgetPreviewRequest,
    BudgetResponse,
    BudgetUpdate,
)
from backend.services.budget_service import budget_calculator

logger = logging.getLogger(__name__)

router = APIRouter()


BUDGET_ALLOWED_STATUSES = {"quoting"}


async def _get_order_or_404(order_id: UUID, user_id: UUID, db: AsyncSession) -> Order:
    result = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == user_id,
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order


def _require_budget_allowed_status(order: Order) -> None:
    if order.status not in BUDGET_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget can only be managed when order is in 'quoting' status, "
                   f"current status is '{order.status}'",
        )


async def _get_budget_for_order_or_404(order_id: UUID, user_id: UUID, db: AsyncSession) -> Budget:
    result = await db.execute(
        select(Budget).where(
            Budget.order_id == order_id,
            Budget.user_id == user_id,
        ).order_by(Budget.version.desc()).limit(1)
    )
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budget found for this order",
        )
    return budget


def _build_budget_response(budget: Budget, breakdown: dict | None = None) -> dict:
    filament_items = budget.filament_items or []
    raw: list[dict] = list(filament_items) if isinstance(filament_items, list) else []

    if breakdown is None:
        from decimal import Decimal
        from backend.services.budget_service import calculate_breakdown

        manual_cost = Decimal(str(budget.manual_filament_cost)) if budget.manual_filament_cost is not None else None
        manual_price = Decimal(str(budget.manual_price)) if budget.manual_price is not None else None
        breakdown = calculate_breakdown(
            filament_items=raw,
            manual_filament_cost=manual_cost,
            hours=budget.hours,
            minutes=budget.minutes,
            extra_costs=Decimal(str(budget.extra_costs)),
            margin_type=budget.margin_type,
            manual_price=manual_price,
            currency=budget.currency,
        )

    return {
        "id": budget.id,
        "order_id": budget.order_id,
        "version": budget.version,
        "currency": budget.currency,
        "filament_items": raw,
        "manual_filament_cost": float(budget.manual_filament_cost) if budget.manual_filament_cost is not None else None,
        "manual_grams": float(budget.manual_grams) if budget.manual_grams is not None else None,
        "hours": budget.hours,
        "minutes": budget.minutes,
        "margin_type": budget.margin_type,
        "extra_costs": float(budget.extra_costs),
        "error_margin_percent": breakdown["error_margin_percent"],
        "margin_multiplier": breakdown["margin_multiplier"],
        "final_price": float(budget.final_price),
        "manual_price": float(budget.manual_price) if budget.manual_price is not None else None,
        "ml_price": breakdown["ml_price"],
        "filament_total": breakdown["filament_total"],
        "electricity_cost": breakdown["electricity_cost"],
        "amortization_cost": breakdown["amortization_cost"],
        "subtotal": breakdown["subtotal"],
        "subtotal_with_error": breakdown["subtotal_with_error"],
        "total_before_margin": breakdown["total_before_margin"],
        "notes": budget.notes,
        "created_at": budget.created_at.isoformat() if hasattr(budget.created_at, 'isoformat') else str(budget.created_at),
        "updated_at": budget.updated_at.isoformat() if hasattr(budget.updated_at, 'isoformat') else str(budget.updated_at),
    }


@router.post("/api/orders/{order_id}/budget", response_model=BudgetResponse, status_code=201)
async def create_budget(
    order_id: UUID,
    body: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await _get_order_or_404(order_id, current_user.id, db)
    _require_budget_allowed_status(order)

    existing = await db.execute(
        select(Budget).where(Budget.order_id == order_id).order_by(Budget.version.desc()).limit(1)
    )
    existing_budget = existing.scalar_one_or_none()
    new_version = (existing_budget.version + 1) if existing_budget else 1

    items_dicts = [item.model_dump() for item in body.filament_items]
    calc_result = await budget_calculator.calculate_create(
        db=db,
        filament_items=items_dicts,
        manual_filament_cost=body.manual_filament_cost,
        hours=body.hours,
        minutes=body.minutes,
        extra_costs=body.extra_costs,
        margin_type=body.margin_type,
        manual_price=body.manual_price,
        currency=body.currency,
    )

    budget = Budget(
        order_id=order.id,
        user_id=current_user.id,
        currency=body.currency,
        version=new_version,
        filament_items=calc_result["filament_items"],
        manual_filament_cost=body.manual_filament_cost,
        manual_grams=body.manual_grams,
        hours=body.hours,
        minutes=body.minutes,
        extra_costs=body.extra_costs,
        margin_type=body.margin_type,
        error_margin_percent=calc_result["error_margin_percent"],
        margin_multiplier=calc_result["margin_multiplier"],
        final_price=calc_result["final_price"],
        manual_price=body.manual_price,
        notes=body.notes,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)

    calc_result["final_price"] = calc_result["final_price"]

    return _build_budget_response(budget, calc_result)


@router.get("/api/orders/{order_id}/budget", response_model=BudgetResponse)
async def get_budget(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await _get_order_or_404(order_id, current_user.id, db)

    budget = await _get_budget_for_order_or_404(order_id, current_user.id, db)

    return _build_budget_response(budget)


@router.put("/api/orders/{order_id}/budget", response_model=BudgetResponse)
async def update_budget(
    order_id: UUID,
    body: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await _get_order_or_404(order_id, current_user.id, db)
    _require_budget_allowed_status(order)

    budget = await _get_budget_for_order_or_404(order_id, current_user.id, db)

    if body.currency is not None:
        budget.currency = body.currency
    if body.filament_items is not None:
        items_dicts = [item.model_dump() for item in body.filament_items]
        calc_result = await budget_calculator.calculate_create(
            db=db,
            filament_items=items_dicts,
            manual_filament_cost=body.manual_filament_cost if body.manual_filament_cost is not None else (
                float(budget.manual_filament_cost) if budget.manual_filament_cost is not None else None
            ),
            hours=body.hours if body.hours is not None else budget.hours,
            minutes=body.minutes if body.minutes is not None else budget.minutes,
            extra_costs=body.extra_costs if body.extra_costs is not None else float(budget.extra_costs),
            margin_type=body.margin_type if body.margin_type is not None else budget.margin_type,
            manual_price=body.manual_price if body.manual_price is not None else (
                float(budget.manual_price) if budget.manual_price is not None else None
            ),
            currency=body.currency if body.currency is not None else budget.currency,
        )
        budget.filament_items = calc_result["filament_items"]
        budget.error_margin_percent = calc_result["error_margin_percent"]
        budget.margin_multiplier = calc_result["margin_multiplier"]
        budget.final_price = calc_result["final_price"]
    else:
        calc_result = None

    if body.manual_filament_cost is not None:
        budget.manual_filament_cost = body.manual_filament_cost
    if body.manual_grams is not None:
        budget.manual_grams = body.manual_grams
    if body.hours is not None:
        budget.hours = body.hours
    if body.minutes is not None:
        budget.minutes = body.minutes
    if body.extra_costs is not None:
        budget.extra_costs = body.extra_costs
    if body.margin_type is not None:
        budget.margin_type = body.margin_type
    if body.manual_price is not None:
        budget.manual_price = body.manual_price
    if body.notes is not None:
        budget.notes = body.notes

    await db.commit()
    await db.refresh(budget)

    return _build_budget_response(budget, calc_result)


@router.post("/api/orders/{order_id}/budget/preview", response_model=BudgetResponse)
async def preview_budget(
    order_id: UUID,
    body: BudgetPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await _get_order_or_404(order_id, current_user.id, db)
    _require_budget_allowed_status(order)

    items_dicts = [item.model_dump() for item in body.filament_items]
    enriched_items = await budget_calculator.enrich_filament_items(db, items_dicts)

    calc_result = budget_calculator.calculate_preview(
        filament_items=enriched_items,
        manual_filament_cost=body.manual_filament_cost,
        hours=body.hours,
        minutes=body.minutes,
        extra_costs=body.extra_costs,
        margin_type=body.margin_type,
        manual_price=body.manual_price,
        currency=body.currency,
    )

    return {
        "id": UUID("00000000-0000-0000-0000-000000000000"),
        "order_id": order.id,
        "version": 0,
        "currency": body.currency,
        "filament_items": enriched_items,
        "manual_filament_cost": body.manual_filament_cost,
        "manual_grams": body.manual_grams,
        "hours": body.hours,
        "minutes": body.minutes,
        "margin_type": body.margin_type,
        "extra_costs": body.extra_costs,
        "error_margin_percent": calc_result["error_margin_percent"],
        "margin_multiplier": calc_result["margin_multiplier"],
        "final_price": calc_result["final_price"],
        "manual_price": body.manual_price,
        "ml_price": calc_result["ml_price"],
        "filament_total": calc_result["filament_total"],
        "electricity_cost": calc_result["electricity_cost"],
        "amortization_cost": calc_result["amortization_cost"],
        "subtotal": calc_result["subtotal"],
        "subtotal_with_error": calc_result["subtotal_with_error"],
        "total_before_margin": calc_result["total_before_margin"],
        "notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
