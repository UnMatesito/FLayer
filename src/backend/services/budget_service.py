import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.budget_parameters import BudgetParameters
from backend.models.filament import Filament

logger = logging.getLogger(__name__)

SEED_PARAMETERS_ARS = {
    "electricity_price_kwh": Decimal("140.00"),
    "error_margin_percent": Decimal("5.00"),
}

SEED_PARAMETERS_USD = {
    "electricity_price_kwh": Decimal("0.15"),
    "error_margin_percent": Decimal("5.00"),
}

SEED_PARAMETERS_EUR = {
    "electricity_price_kwh": Decimal("0.25"),
    "error_margin_percent": Decimal("5.00"),
}

SEED_PARAMETERS_BRL = {
    "electricity_price_kwh": Decimal("0.80"),
    "error_margin_percent": Decimal("5.00"),
}

SEED_PARAMETERS_GBP = {
    "electricity_price_kwh": Decimal("0.25"),
    "error_margin_percent": Decimal("5.00"),
}

SEED_PARAMETERS_MXN = {
    "electricity_price_kwh": Decimal("2.50"),
    "error_margin_percent": Decimal("5.00"),
}

MARGIN_PRESETS: dict[str, Decimal] = {
    "high_volume": Decimal("2.00"),
    "medium_volume": Decimal("2.50"),
    "wholesale": Decimal("3.00"),
    "intermediate": Decimal("3.50"),
    "retail": Decimal("4.00"),
    "keychain": Decimal("5.00"),
}

MACHINE_DEFAULTS_ARS = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("150000.00"),
    "machine_lifespan_hours": Decimal("4320"),
}

MACHINE_DEFAULTS_USD = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("400.00"),
    "machine_lifespan_hours": Decimal("5000"),
}

MACHINE_DEFAULTS_EUR = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("400.00"),
    "machine_lifespan_hours": Decimal("5000"),
}

MACHINE_DEFAULTS_BRL = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("2200.00"),
    "machine_lifespan_hours": Decimal("5000"),
}

MACHINE_DEFAULTS_GBP = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("320.00"),
    "machine_lifespan_hours": Decimal("5000"),
}

MACHINE_DEFAULTS_MXN = {
    "machine_wattage": Decimal("120"),
    "machine_cost": Decimal("8000.00"),
    "machine_lifespan_hours": Decimal("5000"),
}

SEED_PARAMETERS: dict[str, dict[str, Decimal]] = {
    "ARS": SEED_PARAMETERS_ARS,
    "USD": SEED_PARAMETERS_USD,
    "EUR": SEED_PARAMETERS_EUR,
    "BRL": SEED_PARAMETERS_BRL,
    "GBP": SEED_PARAMETERS_GBP,
    "MXN": SEED_PARAMETERS_MXN,
}

MACHINE_DEFAULTS: dict[str, dict[str, Decimal]] = {
    "ARS": MACHINE_DEFAULTS_ARS,
    "USD": MACHINE_DEFAULTS_USD,
    "EUR": MACHINE_DEFAULTS_EUR,
    "BRL": MACHINE_DEFAULTS_BRL,
    "GBP": MACHINE_DEFAULTS_GBP,
    "MXN": MACHINE_DEFAULTS_MXN,
}

CONFIGURABLE_KEYS = frozenset({
    "electricity_price_kwh",
    "error_margin_percent",
})


def _get_machine_defaults(currency: str) -> dict[str, Decimal]:
    return MACHINE_DEFAULTS.get(currency, MACHINE_DEFAULTS_ARS)


async def get_budget_parameters(
    db: AsyncSession,
    user_id: UUID,
    currency: str,
) -> dict[str, Decimal]:
    """Return the configurable budget parameters for (user, currency), seeding on first access.

    Always ends with a DB row: when no row exists, one is inserted with the
    seed values (is_default = TRUE) before returning.
    """
    result = await db.execute(
        select(BudgetParameters).where(
            BudgetParameters.user_id == user_id,
            BudgetParameters.currency == currency,
        )
    )
    row = result.scalar_one_or_none()

    if row is None:
        seed = SEED_PARAMETERS.get(currency, SEED_PARAMETERS_ARS)
        row = BudgetParameters(
            user_id=user_id,
            currency=currency,
            electricity_price_kwh=seed["electricity_price_kwh"],
            error_margin_percent=seed["error_margin_percent"],
            is_default=True,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

    return {
        "electricity_price_kwh": Decimal(str(row.electricity_price_kwh)),
        "error_margin_percent": Decimal(str(row.error_margin_percent)),
    }


def resolve_margin_multiplier(
    margin_type: str,
    custom_multiplier: Decimal | None,
) -> Decimal:
    if margin_type == "custom":
        if custom_multiplier is None:
            raise ValueError("custom margin requires a multiplier")
        return custom_multiplier
    return MARGIN_PRESETS[margin_type]


def resolve_machine_params(
    printer: Any | None,
    currency: str,
) -> dict[str, Decimal]:
    """Resolve machine parameters from a printer profile with per-field fallback.

    Each profile field that is NULL (or no printer at all) falls back to the
    currency default. Returns the resolved values as Decimals.
    """
    defaults = _get_machine_defaults(currency)
    return {
        "power_watts": (
            Decimal(str(printer.power_watts))
            if printer is not None and printer.power_watts is not None
            else defaults["machine_wattage"]
        ),
        "lifespan_hours": (
            Decimal(str(printer.lifespan_hours))
            if printer is not None and printer.lifespan_hours is not None
            else defaults["machine_lifespan_hours"]
        ),
        "spare_parts_cost": (
            Decimal(str(printer.spare_parts_cost))
            if printer is not None and printer.spare_parts_cost is not None
            else defaults["machine_cost"]
        ),
    }


def calculate_breakdown(
    filament_items: list[dict[str, Any]],
    manual_filament_cost: Decimal | None,
    hours: int,
    minutes: int,
    extra_costs: Decimal,
    assembly_cost: Decimal,
    sanding_cost: Decimal,
    painting_cost: Decimal,
    margin_type: str,
    margin_multiplier: Decimal | None,
    manual_price: Decimal | None,
    currency: str,
    electricity_price_kwh: Decimal,
    error_margin_percent: Decimal,
    power_watts: Decimal,
    lifespan_hours: Decimal,
    spare_parts_cost: Decimal,
) -> dict[str, Any]:
    if manual_filament_cost is not None:
        filament_total = manual_filament_cost
    else:
        filament_total = sum(
            Decimal(str(item.get("cost", 0)))
            for item in filament_items
        )

    time_hours = Decimal(str(hours)) + Decimal(str(minutes)) / Decimal("60")

    machine_wattage = power_watts
    machine_cost = spare_parts_cost
    machine_lifespan_hours = lifespan_hours

    electricity_cost = time_hours * (machine_wattage / Decimal("1000")) * electricity_price_kwh
    amortization_cost = time_hours * (machine_cost / machine_lifespan_hours)
    subtotal = filament_total + electricity_cost + amortization_cost
    subtotal_with_error = subtotal * (Decimal("1") + error_margin_percent / Decimal("100"))
    post_processing_total = assembly_cost + sanding_cost + painting_cost
    total_before_margin = subtotal_with_error + extra_costs + post_processing_total

    resolved_margin_multiplier = resolve_margin_multiplier(margin_type, margin_multiplier)

    if manual_price is not None:
        final_price = manual_price
    else:
        final_price = total_before_margin * resolved_margin_multiplier

    return {
        "filament_total": float(round(filament_total, 2)),
        "electricity_cost": float(round(electricity_cost, 2)),
        "amortization_cost": float(round(amortization_cost, 2)),
        "subtotal": float(round(subtotal, 2)),
        "subtotal_with_error": float(round(subtotal_with_error, 2)),
        "post_processing_total": float(round(post_processing_total, 2)),
        "total_before_margin": float(round(total_before_margin, 2)),
        "final_price": float(round(final_price, 2)),
        "margin_multiplier": float(resolved_margin_multiplier),
        "error_margin_percent": float(error_margin_percent),
        "power_watts": float(machine_wattage),
        "lifespan_hours": float(machine_lifespan_hours),
        "spare_parts_cost": float(machine_cost),
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
        assembly_cost: float,
        sanding_cost: float,
        painting_cost: float,
        margin_type: str,
        margin_multiplier: float | None,
        manual_price: float | None,
        currency: str,
        electricity_price_kwh: Decimal,
        error_margin_percent: Decimal,
        power_watts: Decimal,
        lifespan_hours: Decimal,
        spare_parts_cost: Decimal,
    ) -> dict[str, Any]:
        enriched_items = await self.enrich_filament_items(db, filament_items)

        breakdown = calculate_breakdown(
            filament_items=enriched_items,
            manual_filament_cost=Decimal(str(manual_filament_cost)) if manual_filament_cost is not None else None,
            hours=hours,
            minutes=minutes,
            extra_costs=Decimal(str(extra_costs)),
            assembly_cost=Decimal(str(assembly_cost)),
            sanding_cost=Decimal(str(sanding_cost)),
            painting_cost=Decimal(str(painting_cost)),
            margin_type=margin_type,
            margin_multiplier=Decimal(str(margin_multiplier)) if margin_multiplier is not None else None,
            manual_price=Decimal(str(manual_price)) if manual_price is not None else None,
            currency=currency,
            electricity_price_kwh=electricity_price_kwh,
            error_margin_percent=error_margin_percent,
            power_watts=power_watts,
            lifespan_hours=lifespan_hours,
            spare_parts_cost=spare_parts_cost,
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
        assembly_cost: float,
        sanding_cost: float,
        painting_cost: float,
        margin_type: str,
        margin_multiplier: float | None,
        manual_price: float | None,
        currency: str,
        electricity_price_kwh: Decimal,
        error_margin_percent: Decimal,
        power_watts: Decimal,
        lifespan_hours: Decimal,
        spare_parts_cost: Decimal,
    ) -> dict[str, Any]:
        return calculate_breakdown(
            filament_items=filament_items,
            manual_filament_cost=Decimal(str(manual_filament_cost)) if manual_filament_cost is not None else None,
            hours=hours,
            minutes=minutes,
            extra_costs=Decimal(str(extra_costs)),
            assembly_cost=Decimal(str(assembly_cost)),
            sanding_cost=Decimal(str(sanding_cost)),
            painting_cost=Decimal(str(painting_cost)),
            margin_type=margin_type,
            margin_multiplier=Decimal(str(margin_multiplier)) if margin_multiplier is not None else None,
            manual_price=Decimal(str(manual_price)) if manual_price is not None else None,
            currency=currency,
            electricity_price_kwh=electricity_price_kwh,
            error_margin_percent=error_margin_percent,
            power_watts=power_watts,
            lifespan_hours=lifespan_hours,
            spare_parts_cost=spare_parts_cost,
        )


budget_calculator = BudgetCalculator()
