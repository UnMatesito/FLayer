import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.filament import Filament
from backend.models.product import FixedProduct
from backend.models.product_stock_movement import ProductStockMovement
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
    LowStockItem,
    LowStockProduct,
    LowStockResponse,
    LowStockSupply,
    MovementItemOption,
    PaginatedStockMovements,
    PaginatedUnifiedMovements,
    StockMovementResponse,
    SupplyAdjustRequest,
    SupplyAdjustResponse,
    SupplyCreate,
    SupplyResponse,
    SupplyUpdate,
    VALID_MOVEMENT_TYPES,
    UnifiedMovementResponse,
)
from backend.services.stock_service import stock_service

logger = logging.getLogger(__name__)

router = APIRouter()

ITEM_TYPE_LABELS = {"product": "Producto", "filament": "Filamento", "supply": "Insumo"}


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


@router.patch("/api/supplies/{supply_id}/adjust", response_model=SupplyAdjustResponse)
async def adjust_supply_stock(
    supply_id: UUID,
    body: SupplyAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupplyAdjustResponse:
    try:
        new_quantity, movement_id = await stock_service.adjust_supply(
            db=db,
            supply_id=supply_id,
            delta=body.delta,
            user_id=current_user.id,
            notes=body.notes,
        )
        await db.commit()
        return SupplyAdjustResponse(
            id=supply_id,
            quantity=new_quantity,
            movement_id=movement_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/stock-movements", response_model=PaginatedStockMovements)
async def list_stock_movements(
    filament_id: UUID | None = Query(None),
    supply_id: UUID | None = Query(None),
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
    if supply_id is not None:
        query = query.where(StockMovement.supply_id == supply_id)
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
        if m.filament_id:
            filament_result = await db.execute(
                select(Filament.color_name).where(Filament.id == m.filament_id)
            )
            filament_row = filament_result.scalar_one_or_none()
            if filament_row:
                filament_name = filament_row

        supply_name = None
        unit = m.unit
        if m.supply_id:
            supply_result = await db.execute(
                select(Supply.name, Supply.unit).where(Supply.id == m.supply_id)
            )
            supply_row = supply_result.first()
            if supply_row:
                supply_name = supply_row[0]
                unit = unit or supply_row[1]

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
                supply_id=m.supply_id,
                supply_name=supply_name,
                movement_type=m.movement_type,
                quantity_grams=float(m.quantity_grams) if m.quantity_grams is not None else None,
                quantity=float(m.quantity) if m.quantity is not None else None,
                unit=unit,
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


@router.get("/api/stock/movement-items", response_model=list[MovementItemOption])
async def list_movement_items(
    q: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MovementItemOption]:
    needle = q.strip().lower() if q else ""
    products = (
        await db.execute(
            select(FixedProduct).where(FixedProduct.user_id == current_user.id).order_by(FixedProduct.name.asc())
        )
    ).scalars().all()
    filaments = (
        await db.execute(select(Filament).where(Filament.user_id == current_user.id).order_by(Filament.color_name.asc()))
    ).scalars().all()
    supplies = (
        await db.execute(select(Supply).where(Supply.user_id == current_user.id).order_by(Supply.name.asc()))
    ).scalars().all()

    options: list[MovementItemOption] = []
    for product in products:
        options.append(MovementItemOption(key=f"product:{product.id}", id=product.id, type="product", type_label="Producto", label=product.name))
    for filament in filaments:
        options.append(MovementItemOption(key=f"filament:{filament.id}", id=filament.id, type="filament", type_label="Filamento", label=filament.color_name))
    for supply in supplies:
        options.append(MovementItemOption(key=f"supply:{supply.id}", id=supply.id, type="supply", type_label="Insumo", label=supply.name))
    if needle:
        options = [option for option in options if needle in option.label.lower() or needle in option.type_label.lower()]
    return options


def _parse_item_keys(item_keys: list[str] | None) -> tuple[set[UUID], set[UUID], set[UUID]]:
    product_ids: set[UUID] = set()
    filament_ids: set[UUID] = set()
    supply_ids: set[UUID] = set()
    for raw in item_keys or []:
        values = [part.strip() for part in raw.split(",") if part.strip()]
        for value in values:
            try:
                item_type, item_id = value.split(":", 1)
                parsed = UUID(item_id)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="item_keys must use product:<id>, filament:<id> or supply:<id>",
                ) from exc
            if item_type == "product":
                product_ids.add(parsed)
            elif item_type == "filament":
                filament_ids.add(parsed)
            elif item_type == "supply":
                supply_ids.add(parsed)
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="item_keys must use product:<id>, filament:<id> or supply:<id>",
                )
    return product_ids, filament_ids, supply_ids


@router.get("/api/stock/movements/unified", response_model=PaginatedUnifiedMovements)
async def list_unified_movements(
    item_keys: list[str] | None = Query(None),
    movement_type: str | None = Query(None),
    order_id: UUID | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedUnifiedMovements:
    if movement_type is not None and movement_type not in VALID_MOVEMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid movement_type. Must be one of: {', '.join(sorted(VALID_MOVEMENT_TYPES))}",
        )

    product_ids, filament_ids, supply_ids = _parse_item_keys(item_keys)
    has_item_filter = bool(product_ids or filament_ids or supply_ids)
    rows: list[UnifiedMovementResponse] = []

    if not has_item_filter or product_ids:
        product_query = select(ProductStockMovement, FixedProduct.name).join(
            FixedProduct, FixedProduct.id == ProductStockMovement.product_id
        ).where(ProductStockMovement.user_id == current_user.id)
        if product_ids:
            product_query = product_query.where(ProductStockMovement.product_id.in_(product_ids))
        if movement_type is not None:
            product_query = product_query.where(ProductStockMovement.movement_type == movement_type)
        if order_id is not None:
            product_query = product_query.where(ProductStockMovement.order_id == order_id)
        if date_from is not None:
            product_query = product_query.where(ProductStockMovement.created_at >= date_from)
        if date_to is not None:
            product_query = product_query.where(ProductStockMovement.created_at <= date_to)
        for movement, product_name in (await db.execute(product_query)).all():
            rows.append(
                UnifiedMovementResponse(
                    id=movement.id,
                    source="product",
                    item_id=movement.product_id,
                    item_type="product",
                    item_type_label="Producto",
                    item_name=product_name,
                    movement_type=movement.movement_type,
                    quantity=float(movement.quantity),
                    unit="uds.",
                    order_id=movement.order_id,
                    created_by_user_id=movement.created_by_user_id,
                    metadata={"product_id": str(movement.product_id), "notes": movement.notes},
                    created_at=movement.created_at,
                )
            )

    if not has_item_filter or filament_ids or supply_ids:
        stock_query = select(StockMovement, Filament.color_name, Supply.name, Supply.unit).outerjoin(
            Filament, Filament.id == StockMovement.filament_id
        ).outerjoin(Supply, Supply.id == StockMovement.supply_id).where(StockMovement.user_id == current_user.id)
        if filament_ids and supply_ids:
            stock_query = stock_query.where(or_(StockMovement.filament_id.in_(filament_ids), StockMovement.supply_id.in_(supply_ids)))
        elif filament_ids:
            stock_query = stock_query.where(StockMovement.filament_id.in_(filament_ids))
        elif supply_ids:
            stock_query = stock_query.where(StockMovement.supply_id.in_(supply_ids))
        if movement_type is not None:
            stock_query = stock_query.where(StockMovement.movement_type == movement_type)
        if order_id is not None:
            stock_query = stock_query.where(StockMovement.order_id == order_id)
        if date_from is not None:
            stock_query = stock_query.where(StockMovement.created_at >= date_from)
        if date_to is not None:
            stock_query = stock_query.where(StockMovement.created_at <= date_to)
        for movement, filament_name, supply_name, supply_unit in (await db.execute(stock_query)).all():
            is_supply = movement.supply_id is not None
            item_id = movement.supply_id if is_supply else movement.filament_id
            if item_id is None:
                continue
            rows.append(
                UnifiedMovementResponse(
                    id=movement.id,
                    source="stock_movement",
                    item_id=item_id,
                    item_type="supply" if is_supply else "filament",
                    item_type_label="Insumo" if is_supply else "Filamento",
                    item_name=supply_name if is_supply else filament_name,
                    movement_type=movement.movement_type,
                    quantity=float(movement.quantity if is_supply else movement.quantity_grams),
                    unit=movement.unit or supply_unit or "g",
                    order_id=movement.order_id,
                    created_by_user_id=movement.created_by_user_id,
                    metadata={"stock_movement_id": str(movement.id), "notes": movement.notes},
                    created_at=movement.created_at,
                )
            )

    rows.sort(key=lambda row: row.created_at, reverse=True)
    total = len(rows)
    start = (page - 1) * per_page
    return PaginatedUnifiedMovements(items=rows[start:start + per_page], total=total, page=page, per_page=per_page)


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

    product_result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.user_id == current_user.id,
            FixedProduct.is_active == True,
            FixedProduct.stock_quantity < 1,
        )
    )
    low_products = product_result.scalars().all()

    filament_items = [
        LowStockItem(
            id=f.id,
            type="filament",
            label=f.color_name,
            current_stock=float(f.weight_grams),
            threshold=float(f.min_stock_warning_grams),
            unit="g",
            href=f"/dashboard/stock/filaments/{f.id}",
        )
        for f in low_filaments
    ]
    supply_items = [
        LowStockItem(
            id=s.id,
            type="supply",
            label=s.name,
            current_stock=float(s.quantity),
            threshold=float(s.min_stock_warning),
            unit=s.unit,
            href="/dashboard/stock/supplies",
        )
        for s in low_supplies
    ]
    product_items = [
        LowStockItem(
            id=p.id,
            type="product",
            label=p.name,
            current_stock=float(p.stock_quantity),
            threshold=1,
            unit="uds.",
            href=f"/dashboard/products/{p.id}",
        )
        for p in low_products
    ]

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
        products=[
            LowStockProduct(
                id=p.id,
                name=p.name,
                stock_quantity=float(p.stock_quantity),
                threshold=1,
            )
            for p in low_products
        ],
        items=[*product_items, *filament_items, *supply_items],
    )
