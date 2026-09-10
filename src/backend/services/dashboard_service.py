from datetime import datetime, time, timedelta, timezone

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.budget import Budget
from backend.models.customer import Customer
from backend.models.filament import Filament
from backend.models.order import Order
from backend.models.printer import Printer, PrinterMaintenance
from backend.models.product import FixedProduct
from backend.models.supply import Supply

ACTIVITY_DAYS = 14
PENDING_STATUSES = ("new", "quoting")


def _final_value(budget_final_price: float | None, order_total: float | None) -> float:
    """Final value of an order: latest budget final_price, else orders.total, else 0."""
    if budget_final_price is not None:
        return float(budget_final_price)
    if order_total is not None:
        return float(order_total)
    return 0.0


def _latest_budget_subquery(user_id) -> object:
    return (
        select(Budget.order_id, Budget.final_price)
        .where(Budget.user_id == user_id)
        .distinct(Budget.order_id)
        .order_by(Budget.order_id, Budget.version.desc())
        .subquery()
    )


class DashboardService:
    """Batched, tenant-scoped aggregation for the home dashboard snapshot."""

    async def build_summary(self, db: AsyncSession, user_id) -> dict:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        month_start = datetime(now.year, now.month, 1)
        today = now.date()
        first_day = today - timedelta(days=ACTIVITY_DAYS - 1)
        window_start = datetime.combine(first_day, time.min)
        window_end = datetime.combine(today + timedelta(days=1), time.min)

        lb = _latest_budget_subquery(user_id)

        # 1. Month KPIs: orders + revenue + quoting value + status counts in one pass.
        month_agg_stmt = (
            select(
                func.count(Order.id).label("orders_month"),
                func.coalesce(
                    func.sum(func.coalesce(lb.c.final_price, Order.total, 0.0))
                    .filter(Order.status != "cancelled"),
                    0.0,
                ).label("revenue_month"),
                func.count(Order.id)
                .filter(Order.status.in_(PENDING_STATUSES))
                .label("pending_orders"),
                func.count(Order.id).filter(Order.status == "printing").label("printing_orders"),
                func.coalesce(
                    func.sum(func.coalesce(lb.c.final_price, 0.0))
                    .filter(Order.status == "quoting"),
                    0.0,
                ).label("budgeted_value_quoting"),
            )
            .outerjoin(lb, lb.c.order_id == Order.id)
            .where(Order.user_id == user_id, Order.created_at >= month_start)
        )
        month_row = (await db.execute(month_agg_stmt)).mappings().one()

        # 2. Activity: non-cancelled orders over the last 14 days, grouped by UTC day.
        activity_stmt = (
            select(
                cast(Order.created_at, Date).label("day"),
                func.count(Order.id).label("orders"),
                func.coalesce(
                    func.sum(func.coalesce(lb.c.final_price, Order.total, 0.0)),
                    0.0,
                ).label("revenue"),
            )
            .outerjoin(lb, lb.c.order_id == Order.id)
            .where(
                Order.user_id == user_id,
                Order.created_at >= window_start,
                Order.created_at < window_end,
                Order.status != "cancelled",
            )
            .group_by(cast(Order.created_at, Date))
        )
        activity_rows = (await db.execute(activity_stmt)).all()
        day_map = {row.day: (row.orders, row.revenue) for row in activity_rows}
        activity = [
            {
                "date": (first_day + timedelta(days=i)).isoformat(),
                "orders": day_map.get(first_day + timedelta(days=i), (0, 0.0))[0],
                "revenue": day_map.get(first_day + timedelta(days=i), (0, 0.0))[1],
            }
            for i in range(ACTIVITY_DAYS)
        ]

        # 3. Recent orders: 5 most recent non-cancelled, with customer name and final value.
        recent_stmt = (
            select(Order, Customer.name, lb.c.final_price)
            .join(Customer, Customer.id == Order.customer_id)
            .outerjoin(lb, lb.c.order_id == Order.id)
            .where(Order.user_id == user_id, Order.status != "cancelled")
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        recent_rows = (await db.execute(recent_stmt)).all()
        recent_orders = [
            {
                "id": order.id,
                "short_id": str(order.id)[:8],
                "customer_name": customer_name,
                "work_type": order.work_type,
                "status": order.status,
                "final_value": _final_value(budget_final_price, order.total),
                "created_at": order.created_at,
            }
            for order, customer_name, budget_final_price in recent_rows
        ]

        # 4. Low stock: same predicates as GET /api/stock/low-stock.
        low_filaments = (
            await db.execute(
                select(Filament).where(
                    Filament.user_id == user_id,
                    Filament.is_active == True,  # noqa: E712
                    Filament.weight_grams < Filament.min_stock_warning_grams,
                )
            )
        ).scalars().all()
        low_supplies = (
            await db.execute(
                select(Supply).where(
                    Supply.user_id == user_id,
                    Supply.is_active == True,  # noqa: E712
                    Supply.quantity < Supply.min_stock_warning,
                )
            )
        ).scalars().all()
        low_products = (
            await db.execute(
                select(FixedProduct).where(
                    FixedProduct.user_id == user_id,
                    FixedProduct.is_active == True,  # noqa: E712
                    FixedProduct.stock_quantity < 1,
                )
            )
        ).scalars().all()

        # 5. Printer bay: active printers with their monthly maintenance count.
        maintenance_subq = (
            select(
                PrinterMaintenance.printer_id,
                func.count(PrinterMaintenance.id).label("cnt"),
            )
            .where(
                PrinterMaintenance.user_id == user_id,
                PrinterMaintenance.maintenance_date >= month_start.date(),
            )
            .group_by(PrinterMaintenance.printer_id)
            .subquery()
        )
        printer_stmt = (
            select(Printer, func.coalesce(maintenance_subq.c.cnt, 0).label("maintenance_month"))
            .outerjoin(maintenance_subq, maintenance_subq.c.printer_id == Printer.id)
            .where(Printer.user_id == user_id, Printer.is_active == True)  # noqa: E712
            .order_by(Printer.name.asc())
        )
        printer_rows = (await db.execute(printer_stmt)).all()
        printers = [
            {
                "id": printer.id,
                "name": printer.name,
                "brand": printer.brand,
                "model": printer.model,
                "maintenance_month": maintenance_month,
            }
            for printer, maintenance_month in printer_rows
        ]

        return {
            "kpis": {
                "orders_month": month_row.orders_month,
                "revenue_month": month_row.revenue_month,
                "pending_orders": month_row.pending_orders,
                "printing_orders": month_row.printing_orders,
                "budgeted_value_quoting": month_row.budgeted_value_quoting,
                "low_stock_filaments": len(low_filaments),
                "low_stock_supplies": len(low_supplies),
                "low_stock_products": len(low_products),
                "printers_active": len(printer_rows),
                "maintenance_month": sum(p["maintenance_month"] for p in printers),
            },
            "activity": activity,
            "recent_orders": recent_orders,
            "low_stock": {
                "filaments": [
                    {
                        "id": f.id,
                        "color_name": f.color_name,
                        "weight_grams": float(f.weight_grams),
                        "min_stock_warning_grams": float(f.min_stock_warning_grams),
                    }
                    for f in low_filaments
                ],
                "supplies": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "quantity": float(s.quantity),
                        "unit": s.unit,
                        "min_stock_warning": float(s.min_stock_warning),
                    }
                    for s in low_supplies
                ],
                "products": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "stock_quantity": float(p.stock_quantity),
                        "threshold": 1,
                    }
                    for p in low_products
                ],
                "items": [
                    *[
                        {
                            "id": p.id,
                            "type": "product",
                            "label": p.name,
                            "current_stock": float(p.stock_quantity),
                            "threshold": 1,
                            "unit": "uds.",
                            "href": f"/dashboard/products/{p.id}",
                        }
                        for p in low_products
                    ],
                    *[
                        {
                            "id": f.id,
                            "type": "filament",
                            "label": f.color_name,
                            "current_stock": float(f.weight_grams),
                            "threshold": float(f.min_stock_warning_grams),
                            "unit": "g",
                            "href": f"/dashboard/stock/filaments/{f.id}",
                        }
                        for f in low_filaments
                    ],
                    *[
                        {
                            "id": s.id,
                            "type": "supply",
                            "label": s.name,
                            "current_stock": float(s.quantity),
                            "threshold": float(s.min_stock_warning),
                            "unit": s.unit,
                            "href": "/dashboard/stock/supplies",
                        }
                        for s in low_supplies
                    ],
                ],
            },
            "printers": printers,
        }


dashboard_service = DashboardService()
