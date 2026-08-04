import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.printer import Printer, PrinterMaintenance
from backend.models.user import User
from backend.schemas.printer import (
    MaintenanceCreate,
    MaintenanceResponse,
    PrinterCreate,
    PrinterResponse,
    PrinterUpdate,
)
from backend.services.printer_catalog import get_printer_catalog

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_own_printer(
    db: AsyncSession,
    printer_id: UUID,
    user_id: UUID,
) -> Printer:
    result = await db.execute(
        select(Printer).where(
            Printer.id == printer_id,
            Printer.user_id == user_id,
        )
    )
    printer = result.scalar_one_or_none()
    if printer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Printer not found")
    return printer


async def _check_duplicate_active_name(
    db: AsyncSession,
    user_id: UUID,
    name: str,
    exclude_id: UUID | None = None,
) -> None:
    query = select(Printer.id).where(
        Printer.user_id == user_id,
        Printer.is_active == True,  # noqa: E712
        func.lower(Printer.name) == name.lower(),
    )
    if exclude_id is not None:
        query = query.where(Printer.id != exclude_id)
    result = await db.execute(query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active printer with this name",
        )


@router.get("/api/printers/catalog")
async def get_catalog(
    current_user: User = Depends(get_current_user),
) -> dict:
    return get_printer_catalog()


@router.get("/api/printers", response_model=list[PrinterResponse])
async def list_printers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Printer]:
    query = select(Printer).where(
        Printer.user_id == current_user.id,
        Printer.is_active == True,  # noqa: E712
    ).order_by(Printer.name.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/api/printers", response_model=PrinterResponse, status_code=201)
async def create_printer(
    body: PrinterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Printer:
    await _check_duplicate_active_name(db, current_user.id, body.name)

    printer = Printer(
        user_id=current_user.id,
        name=body.name,
        brand=body.brand,
        model=body.model,
        nozzle_sizes=body.nozzle_sizes,
        power_watts=body.power_watts,
        lifespan_hours=body.lifespan_hours,
        spare_parts_cost=body.spare_parts_cost,
        image_url=body.image_url,
        notes=body.notes,
    )
    db.add(printer)
    await db.commit()
    await db.refresh(printer)
    return printer


@router.get("/api/printers/{printer_id}", response_model=PrinterResponse)
async def get_printer(
    printer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Printer:
    return await _get_own_printer(db, printer_id, current_user.id)


@router.patch("/api/printers/{printer_id}", response_model=PrinterResponse)
async def update_printer(
    printer_id: UUID,
    body: PrinterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Printer:
    printer = await _get_own_printer(db, printer_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    if "name" in update_data:
        await _check_duplicate_active_name(db, current_user.id, update_data["name"], exclude_id=printer_id)

    for key, value in update_data.items():
        setattr(printer, key, value)

    await db.commit()
    await db.refresh(printer)
    return printer


@router.delete("/api/printers/{printer_id}")
async def delete_printer(
    printer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    printer = await _get_own_printer(db, printer_id, current_user.id)
    printer.is_active = False
    await db.commit()
    await db.refresh(printer)
    return {"id": str(printer.id), "is_active": printer.is_active}


@router.post("/api/printers/{printer_id}/maintenance", response_model=MaintenanceResponse, status_code=201)
async def create_maintenance(
    printer_id: UUID,
    body: MaintenanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrinterMaintenance:
    await _get_own_printer(db, printer_id, current_user.id)

    record = PrinterMaintenance(
        user_id=current_user.id,
        printer_id=printer_id,
        maintenance_type=body.maintenance_type,
        maintenance_date=body.maintenance_date,
        description=body.description,
        cost=body.cost,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/api/printers/{printer_id}/maintenance", response_model=list[MaintenanceResponse])
async def list_maintenance(
    printer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PrinterMaintenance]:
    await _get_own_printer(db, printer_id, current_user.id)

    result = await db.execute(
        select(PrinterMaintenance)
        .where(PrinterMaintenance.printer_id == printer_id)
        .order_by(PrinterMaintenance.maintenance_date.desc(), PrinterMaintenance.created_at.desc())
    )
    return list(result.scalars().all())
