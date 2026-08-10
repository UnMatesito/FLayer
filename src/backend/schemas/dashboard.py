from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from backend.schemas.stock import LowStockResponse


class KpisResponse(BaseModel):
    orders_month: int
    revenue_month: float
    pending_orders: int
    printing_orders: int
    budgeted_value_quoting: float
    low_stock_filaments: int
    low_stock_supplies: int
    printers_active: int
    maintenance_month: int


class ActivityPoint(BaseModel):
    date: date
    orders: int
    revenue: float


class RecentOrderItem(BaseModel):
    id: UUID
    short_id: str
    customer_name: str
    work_type: str
    status: str
    final_value: float
    created_at: datetime


class PrinterBayItem(BaseModel):
    id: UUID
    name: str
    brand: str | None = None
    model: str | None = None
    maintenance_month: int


class DashboardSummaryResponse(BaseModel):
    as_of: datetime
    kpis: KpisResponse
    activity: list[ActivityPoint]
    recent_orders: list[RecentOrderItem]
    low_stock: LowStockResponse
    printers: list[PrinterBayItem]