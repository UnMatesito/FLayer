import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.filament import Filament

logger = logging.getLogger(__name__)

HARDCODED_DEFAULTS_ARS = {
    "electricity_price_kwh": Decimal("140.00"),
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("150000.00"),
    "machine_lifespan_hours": Decimal("4320"),
    "error_margin_percent": Decimal("5.00"),
    "margin_multiplier_wholesale": Decimal("3.00"),
    "margin_multiplier_retail": Decimal("4.00"),
    "margin_multiplier_keychain": Decimal("5.00"),
}

HARDCODED_DEFAULTS_USD = {
    "electricity_price_kwh": Decimal("0.15"),
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("400.00"),
    "machine_lifespan_hours": Decimal("5000"),
    "error_margin_percent": Decimal("5.00"),
    "margin_multiplier_wholesale": Decimal("3.00"),
    "margin_multiplier_retail": Decimal("4.00"),
    "margin_multiplier_keychain": Decimal("5.00"),
}


def _get_defaults(currency: str) -> dict[str, Decimal]:
    if currency == "USD":
        return HARDCODED_DEFAULTS_USD
    return HARDCODED_DEFAULTS_ARS


def _get_margin_multiplier(margin_type: str, defaults: dict[str, Decimal]) -> Decimal:
    key = f"margin_multiplier_{margin_type}"
    return defaults[key]


def calculate_breakdown(
    filament_items: list[dict[str, Any]],
    manual_filament_cost: Decimal | None,
    hours: int,
    minutes: int,
    extra_costs: Decimal,
    margin_type: str,
    manual_price: Decimal | None,
    currency: str,
) -> dict[str, Any]:
    defaults = _get_defaults(currency)

    if manual_filament_cost is not None:
        filament_total = manual_filament_cost
    else:
        filament_total = sum(
            Decimal(str(item.get("cost", 0)))
            for item in filament_items
        )

    time_hours = Decimal(str(hours)) + Decimal(str(minutes)) / Decimal("60")

    machine_wattage = defaults["machine_wattage"]
    electricity_price_kwh = defaults["electricity_price_kwh"]
    machine_cost = defaults["machine_cost"]
    machine_lifespan_hours = defaults["machine_lifespan_hours"]
    error_margin_percent = defaults["error_margin_percent"]

    electricity_cost = time_hours * (machine_wattage / Decimal("1000")) * electricity_price_kwh
    amortization_cost = time_hours * (machine_cost / machine_lifespan_hours)
    subtotal = filament_total + electricity_cost + amortization_cost
    subtotal_with_error = subtotal * (Decimal("1") + error_margin_percent / Decimal("100"))
    total_before_margin = subtotal_with_error + extra_costs

    margin_multiplier = _get_margin_multiplier(margin_type, defaults)

    if manual_price is not None:
        final_price = manual_price
    else:
        final_price = total_before_margin * margin_multiplier

    ml_price = final_price * Decimal("1.30")

    return {
        "filament_total": float(round(filament_total, 2)),
        "electricity_cost": float(round(electricity_cost, 2)),
        "amortization_cost": float(round(amortization_cost, 2)),
        "subtotal": float(round(subtotal, 2)),
        "subtotal_with_error": float(round(subtotal_with_error, 2)),
        "total_before_margin": float(round(total_before_margin, 2)),
        "final_price": float(round(final_price, 2)),
        "ml_price": float(round(ml_price, 2)),
        "margin_multiplier": float(margin_multiplier),
        "error_margin_percent": float(error_margin_percent),
    }


class BudgetCalculator:

    async def enrich_filament_items(
        self,
        db: AsyncSession,
        filament_items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        enriched = []
        for item in filament_items:
            product_id = item.get("product_id")
            grams = Decimal(str(item.get("grams", 0)))

            if product_id:
                result = await db.execute(
                    select(Filament).where(Filament.id == UUID(str(product_id)))
                )
                filament = result.scalar_one_or_none()
                if filament:
                    price_per_kg = Decimal(str(filament.price_per_kg))
                    product_name = filament.color_name
                    sku = f"{filament.filament_type}-{filament.color_name.upper()[:4]}"
                else:
                    price_per_kg = Decimal("0")
                    product_name = item.get("product_name", "Unknown")
                    sku = item.get("sku", "")
            else:
                price_per_kg = Decimal("0")
                product_name = item.get("product_name", "Unknown")
                sku = item.get("sku", "")

            cost = (grams / Decimal("1000")) * price_per_kg

            enriched.append({
                "product_id": str(product_id) if product_id else None,
                "product_name": product_name,
                "sku": sku,
                "grams": float(grams),
                "price_per_kg": float(price_per_kg),
                "cost": float(round(cost, 2)),
            })

        return enriched

    async def calculate_create(
        self,
        db: AsyncSession,
        filament_items: list[dict[str, Any]],
        manual_filament_cost: float | None,
        hours: int,
        minutes: int,
        extra_costs: float,
        margin_type: str,
        manual_price: float | None,
        currency: str,
    ) -> dict[str, Any]:
        enriched_items = await self.enrich_filament_items(db, filament_items)

        breakdown = calculate_breakdown(
            filament_items=enriched_items,
            manual_filament_cost=Decimal(str(manual_filament_cost)) if manual_filament_cost is not None else None,
            hours=hours,
            minutes=minutes,
            extra_costs=Decimal(str(extra_costs)),
            margin_type=margin_type,
            manual_price=Decimal(str(manual_price)) if manual_price is not None else None,
            currency=currency,
        )

        return {
            "filament_items": enriched_items,
            **breakdown,
        }

    def calculate_preview(
        self,
        filament_items: list[dict[str, Any]],
        manual_filament_cost: float | None,
        hours: int,
        minutes: int,
        extra_costs: float,
        margin_type: str,
        manual_price: float | None,
        currency: str,
    ) -> dict[str, Any]:
        return calculate_breakdown(
            filament_items=filament_items,
            manual_filament_cost=Decimal(str(manual_filament_cost)) if manual_filament_cost is not None else None,
            hours=hours,
            minutes=minutes,
            extra_costs=Decimal(str(extra_costs)),
            margin_type=margin_type,
            manual_price=Decimal(str(manual_price)) if manual_price is not None else None,
            currency=currency,
        )


budget_calculator = BudgetCalculator()
