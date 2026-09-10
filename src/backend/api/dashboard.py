from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.user import User
from backend.schemas.dashboard import (
    ActivityPoint,
    DashboardSummaryResponse,
    KpisResponse,
    PrinterBayItem,
    RecentOrderItem,
)
from backend.schemas.stock import LowStockFilament, LowStockItem, LowStockProduct, LowStockResponse, LowStockSupply
from backend.services.dashboard_service import dashboard_service

router = APIRouter()


@router.get("/api/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    data = await dashboard_service.build_summary(db, current_user.id)
    return DashboardSummaryResponse(
        as_of=datetime.now(timezone.utc),
        kpis=KpisResponse(**data["kpis"]),
        activity=[ActivityPoint(**point) for point in data["activity"]],
        recent_orders=[RecentOrderItem(**item) for item in data["recent_orders"]],
        low_stock=LowStockResponse(
            filaments=[LowStockFilament(**f) for f in data["low_stock"]["filaments"]],
            supplies=[LowStockSupply(**s) for s in data["low_stock"]["supplies"]],
            products=[LowStockProduct(**p) for p in data["low_stock"]["products"]],
            items=[LowStockItem(**item) for item in data["low_stock"]["items"]],
        ),
        printers=[PrinterBayItem(**p) for p in data["printers"]],
    )
