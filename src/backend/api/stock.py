import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.filament import Filament
from backend.models.stock_movement import StockMovement
from backend.models.supply import Supply
from backend.models.user import User
from backend.schemas.stock import (
    FilamentAdjustRequest,
    FilamentAdjustResponse,
    FilamentCreate,
    FilamentResponse,
    FilamentUpdate,
    LowStockFilament,
    LowStockResponse,
    LowStockSupply,
    PaginatedStockMovements,
    StockMovementResponse,
    SupplyCreate,
    SupplyResponse,
    SupplyUpdate,
    VALID_MOVEMENT_TYPES,
)
from backend.services.stock_service import stock_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/filaments", response_model=list[FilamentResponse])
async def list_filaments(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Filament]:
    query = select(Filament).where(Filament.user_id == current_user.id)
    if not include_inactive:
        query = query.where(Filament.is_active == True)
    query = query.order_by(Filament.color_name.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/api/filaments", response_model=FilamentResponse, status_code=201)
async def create_filament(
    body: FilamentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Filament:
    existing = await db.execute(
        select(Filament).where(
            Filament.user_id == current_user.id,
            Filament.color_name == body.color_name,
            Filament.brand == body.brand,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A filament with this color name and brand already exists",
        )

    filament = Filament(
        user_id=current_user.id,
        color_name=body.color_name,
        color_hex=body.color_hex,
        brand=body.brand,
        filament_type=body.filament_type,
        weight_grams=body.weight_grams,
        price_per_kg=body.price_per_kg,
        min_stock_warning_grams=body.min_stock_warning_grams,
        settings=body.settings.model_dump() if body.settings else None,
    )
    db.add(filament)
    await db.commit()
    await db.refresh(filament)
    return filament


@router.get("/api/filaments/{filament_id}", response_model=FilamentResponse)
async def get_filament(
    filament_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Filament:
    result = await db.execute(
        select(Filament).where(
            Filament.id == filament_id,
            Filament.user_id == current_user.id,
        )
    )
    filament = result.scalar_one_or_none()
    if filament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filament not found")
    return filament


@router.patch("/api/filaments/{filament_id}", response_model=FilamentResponse)
async def update_filament(
    filament_id: UUID,
    body: FilamentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Filament:
    result = await db.execute(
        select(Filament).where(
            Filament.id == filament_id,
            Filament.user_id == current_user.id,
        )
    )
    filament = result.scalar_one_or_none()
    if filament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filament not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(filament, key, value)

    await db.commit()
    await db.refresh(filament)
    return filament


@router.patch("/api/filaments/{filament_id}/adjust", response_model=FilamentAdjustResponse)
async def adjust_filament_weight(
    filament_id: UUID,
    body: FilamentAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FilamentAdjustResponse:
    try:
        new_weight, movement_id = await stock_service.adjust(
            db=db,
            filament_id=filament_id,
            delta_grams=body.delta_grams,
            user_id=current_user.id,
            notes=body.notes,
        )
        await db.commit()
        return FilamentAdjustResponse(
            id=filament_id,
            weight_grams=new_weight,
            movement_id=movement_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/api/supplies", response_model=list[SupplyResponse])
async def list_supplies(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Supply]:
    query = select(Supply).where(Supply.user_id == current_user.id)
    if not include_inactive:
        query = query.where(Supply.is_active == True)
    query = query.order_by(Supply.name.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/api/supplies", response_model=SupplyResponse, status_code=201)
async def create_supply(
    body: SupplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Supply:
    supply = Supply(
        user_id=current_user.id,
        name=body.name,
        quantity=body.quantity,
        unit=body.unit,
        min_stock_warning=body.min_stock_warning,
    )
    db.add(supply)
    await db.commit()
    await db.refresh(supply)
    return supply


@router.get("/api/supplies/{supply_id}", response_model=SupplyResponse)
async def get_supply(
    supply_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Supply:
    result = await db.execute(
        select(Supply).where(
            Supply.id == supply_id,
            Supply.user_id == current_user.id,
        )
    )
    supply = result.scalar_one_or_none()
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supply not found")
    return supply


@router.patch("/api/supplies/{supply_id}", response_model=SupplyResponse)
async def update_supply(
    supply_id: UUID,
    body: SupplyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Supply:
    result = await db.execute(
        select(Supply).where(
            Supply.id == supply_id,
            Supply.user_id == current_user.id,
        )
    )
    supply = result.scalar_one_or_none()
    if supply is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supply not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supply, key, value)

    await db.commit()
    await db.refresh(supply)
    return supply


@router.get("/api/stock-movements", response_model=PaginatedStockMovements)
async def list_stock_movements(
    filament_id: UUID | None = Query(None),
    movement_type: str | None = Query(None),
    order_id: UUID | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedStockMovements:
    query = select(StockMovement).where(
        StockMovement.user_id == current_user.id
    )

    if filament_id is not None:
        query = query.where(StockMovement.filament_id == filament_id)
    if movement_type is not None:
        if movement_type not in VALID_MOVEMENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid movement_type. Must be one of: {', '.join(sorted(VALID_MOVEMENT_TYPES))}",
            )
        query = query.where(StockMovement.movement_type == movement_type)
    if order_id is not None:
        query = query.where(StockMovement.order_id == order_id)
    if date_from is not None:
        query = query.where(StockMovement.created_at >= date_from)
    if date_to is not None:
        query = query.where(StockMovement.created_at <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(StockMovement.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    movements = result.scalars().all()

    items = []
    for m in movements:
        filament_name = None
        filament_result = await db.execute(
            select(Filament.color_name).where(Filament.id == m.filament_id)
        )
        filament_row = filament_result.scalar_one_or_none()
        if filament_row:
            filament_name = filament_row

        order_ref = None
        if m.order_id:
            from backend.models.order import Order
            order_result = await db.execute(
                select(Order.id).where(Order.id == m.order_id)
            )
            if order_result.scalar_one_or_none():
                order_ref = str(m.order_id)[:8]

        items.append(
            StockMovementResponse(
                id=m.id,
                filament_id=m.filament_id,
                filament_color_name=filament_name,
                movement_type=m.movement_type,
                quantity_grams=float(m.quantity_grams),
                order_id=m.order_id,
                order_reference=order_ref,
                created_by_user_id=m.created_by_user_id,
                notes=m.notes,
                created_at=m.created_at,
            )
        )

    return PaginatedStockMovements(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/api/stock/low-stock", response_model=LowStockResponse)
async def get_low_stock(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LowStockResponse:
    filament_result = await db.execute(
        select(Filament).where(
            Filament.user_id == current_user.id,
            Filament.is_active == True,
            Filament.weight_grams < Filament.min_stock_warning_grams,
        )
    )
    low_filaments = filament_result.scalars().all()

    supply_result = await db.execute(
        select(Supply).where(
            Supply.user_id == current_user.id,
            Supply.is_active == True,
            Supply.quantity < Supply.min_stock_warning,
        )
    )
    low_supplies = supply_result.scalars().all()

    return LowStockResponse(
        filaments=[
            LowStockFilament(
                id=f.id,
                color_name=f.color_name,
                weight_grams=float(f.weight_grams),
                min_stock_warning_grams=float(f.min_stock_warning_grams),
            )
            for f in low_filaments
        ],
        supplies=[
            LowStockSupply(
                id=s.id,
                name=s.name,
                quantity=float(s.quantity),
                unit=s.unit,
                min_stock_warning=float(s.min_stock_warning),
            )
            for s in low_supplies
        ],
    )
