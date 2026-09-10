from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator

from backend.schemas.auth import ALL_CURRENCIES


VALID_MARGIN_TYPES = {
    "high_volume",
    "medium_volume",
    "wholesale",
    "intermediate",
    "retail",
    "keychain",
    "custom",
}
VALID_CURRENCIES = set(ALL_CURRENCIES)


def _validate_non_negative_amount(value: float, field_name: str) -> float:
    if value < 0:
        raise ValueError(f"{field_name} must be >= 0")
    return value


def _validate_margin_multiplier(value: float | None) -> float | None:
    if value is not None and (value <= 0 or value > 100):
        raise ValueError("margin_multiplier must be greater than 0 and at most 100")
    return value


class FilamentItemInput(BaseModel):
    product_id: UUID | None = None
    product_name: str | None = None
    sku: str | None = None
    grams: float

    @field_validator("grams")
    @classmethod
    def grams_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("grams must be greater than 0")
        return v


class FilamentItemResponse(BaseModel):
    product_id: UUID | None = None
    product_name: str | None = None
    sku: str | None = None
    grams: float
    price_per_kg: float
    cost: float


class BudgetCreate(BaseModel):
    currency: str | None = None
    printer_id: UUID | None = None
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    filament_items: list[FilamentItemInput] = []
    hours: int = 0
    minutes: int = 0
    margin_type: str = "retail"
    margin_multiplier: float | None = None
    extra_costs: float = 0.0
    assembly_cost: float = 0.0
    sanding_cost: float = 0.0
    painting_cost: float = 0.0
    manual_price: float | None = None
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_CURRENCIES:
            raise ValueError(f"currency must be one of: {', '.join(sorted(VALID_CURRENCIES))}")
        return v

    @field_validator("hours")
    @classmethod
    def hours_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("hours must be >= 0")
        if v > 9999:
            raise ValueError("hours must be <= 9999")
        return v

    @field_validator("minutes")
    @classmethod
    def minutes_range(cls, v: int) -> int:
        if v < 0 or v > 59:
            raise ValueError("minutes must be between 0 and 59")
        return v

    @field_validator("margin_type")
    @classmethod
    def valid_margin_type(cls, v: str) -> str:
        if v not in VALID_MARGIN_TYPES:
            raise ValueError(f"margin_type must be one of: {', '.join(sorted(VALID_MARGIN_TYPES))}")
        return v

    @field_validator("extra_costs")
    @classmethod
    def extra_costs_non_negative(cls, v: float) -> float:
        return _validate_non_negative_amount(v, "extra_costs")

    @field_validator("assembly_cost", "sanding_cost", "painting_cost")
    @classmethod
    def post_processing_non_negative(cls, v: float) -> float:
        return _validate_non_negative_amount(v, "post-processing cost")

    @field_validator("margin_multiplier")
    @classmethod
    def margin_multiplier_range(cls, v: float | None) -> float | None:
        return _validate_margin_multiplier(v)

    @field_validator("manual_filament_cost")
    @classmethod
    def manual_filament_cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_filament_cost must be >= 0")
        return v

    @field_validator("manual_grams")
    @classmethod
    def manual_grams_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("manual_grams must be greater than 0")
        return v

    @field_validator("manual_price")
    @classmethod
    def manual_price_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_price must be >= 0")
        return v

    @model_validator(mode="after")
    def validate_filament_items(self) -> "BudgetCreate":
        if self.manual_filament_cost is None and not self.filament_items:
            raise ValueError(
                "At least one filament item is required when manual_filament_cost is not set"
            )
        if self.margin_type == "custom" and self.margin_multiplier is None:
            raise ValueError("margin_multiplier is required when margin_type is custom")
        return self


class BudgetUpdate(BaseModel):
    currency: str | None = None
    printer_id: UUID | None = None
    filament_items: list[FilamentItemInput] | None = None
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int | None = None
    minutes: int | None = None
    margin_type: str | None = None
    margin_multiplier: float | None = None
    extra_costs: float | None = None
    assembly_cost: float | None = None
    sanding_cost: float | None = None
    painting_cost: float | None = None
    manual_price: float | None = None
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_CURRENCIES:
            raise ValueError(f"currency must be one of: {', '.join(sorted(VALID_CURRENCIES))}")
        return v

    @field_validator("hours")
    @classmethod
    def hours_non_negative(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("hours must be >= 0")
        if v is not None and v > 9999:
            raise ValueError("hours must be <= 9999")
        return v

    @field_validator("minutes")
    @classmethod
    def minutes_range(cls, v: int | None) -> int | None:
        if v is not None and (v < 0 or v > 59):
            raise ValueError("minutes must be between 0 and 59")
        return v

    @field_validator("margin_type")
    @classmethod
    def valid_margin_type(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_MARGIN_TYPES:
            raise ValueError(f"margin_type must be one of: {', '.join(sorted(VALID_MARGIN_TYPES))}")
        return v

    @field_validator("extra_costs")
    @classmethod
    def extra_costs_non_negative(cls, v: float | None) -> float | None:
        if v is not None:
            return _validate_non_negative_amount(v, "extra_costs")
        return v

    @field_validator("assembly_cost", "sanding_cost", "painting_cost")
    @classmethod
    def post_processing_non_negative(cls, v: float | None) -> float | None:
        if v is not None:
            return _validate_non_negative_amount(v, "post-processing cost")
        return v

    @field_validator("margin_multiplier")
    @classmethod
    def margin_multiplier_range(cls, v: float | None) -> float | None:
        return _validate_margin_multiplier(v)

    @field_validator("manual_filament_cost")
    @classmethod
    def manual_filament_cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_filament_cost must be >= 0")
        return v

    @field_validator("manual_grams")
    @classmethod
    def manual_grams_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("manual_grams must be greater than 0")
        return v

    @field_validator("manual_price")
    @classmethod
    def manual_price_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_price must be >= 0")
        return v

    @model_validator(mode="after")
    def validate_custom_margin(self) -> "BudgetUpdate":
        if self.margin_type == "custom" and self.margin_multiplier is None:
            raise ValueError("margin_multiplier is required when margin_type is custom")
        return self


class BudgetPreviewRequest(BaseModel):
    currency: str | None = None
    printer_id: UUID | None = None
    filament_items: list[FilamentItemInput] = []
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int = 0
    minutes: int = 0
    margin_type: str = "retail"
    margin_multiplier: float | None = None
    extra_costs: float = 0.0
    assembly_cost: float = 0.0
    sanding_cost: float = 0.0
    painting_cost: float = 0.0
    manual_price: float | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_CURRENCIES:
            raise ValueError(f"currency must be one of: {', '.join(sorted(VALID_CURRENCIES))}")
        return v

    @field_validator("hours")
    @classmethod
    def hours_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("hours must be >= 0")
        if v > 9999:
            raise ValueError("hours must be <= 9999")
        return v

    @field_validator("minutes")
    @classmethod
    def minutes_range(cls, v: int) -> int:
        if v < 0 or v > 59:
            raise ValueError("minutes must be between 0 and 59")
        return v

    @field_validator("margin_type")
    @classmethod
    def valid_margin_type(cls, v: str) -> str:
        if v not in VALID_MARGIN_TYPES:
            raise ValueError(f"margin_type must be one of: {', '.join(sorted(VALID_MARGIN_TYPES))}")
        return v

    @field_validator("extra_costs")
    @classmethod
    def extra_costs_non_negative(cls, v: float) -> float:
        return _validate_non_negative_amount(v, "extra_costs")

    @field_validator("assembly_cost", "sanding_cost", "painting_cost")
    @classmethod
    def post_processing_non_negative(cls, v: float) -> float:
        return _validate_non_negative_amount(v, "post-processing cost")

    @field_validator("margin_multiplier")
    @classmethod
    def margin_multiplier_range(cls, v: float | None) -> float | None:
        return _validate_margin_multiplier(v)

    @field_validator("manual_filament_cost")
    @classmethod
    def manual_filament_cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_filament_cost must be >= 0")
        return v

    @field_validator("manual_grams")
    @classmethod
    def manual_grams_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("manual_grams must be greater than 0")
        return v

    @field_validator("manual_price")
    @classmethod
    def manual_price_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("manual_price must be >= 0")
        return v

    @model_validator(mode="after")
    def validate_custom_margin(self) -> "BudgetPreviewRequest":
        if self.margin_type == "custom" and self.margin_multiplier is None:
            raise ValueError("margin_multiplier is required when margin_type is custom")
        return self


class BudgetResponse(BaseModel):
    id: UUID
    order_id: UUID
    version: int
    currency: str
    printer_id: UUID | None = None
    printer_name: str | None = None
    power_watts: float | None = None
    lifespan_hours: float | None = None
    spare_parts_cost: float | None = None
    filament_items: list[dict[str, Any]]
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int
    minutes: int
    margin_type: str
    extra_costs: float
    assembly_cost: float
    sanding_cost: float
    painting_cost: float
    error_margin_percent: float
    margin_multiplier: float
    final_price: float
    manual_price: float | None = None
    filament_total: float
    electricity_cost: float
    amortization_cost: float
    subtotal: float
    subtotal_with_error: float
    post_processing_total: float
    total_before_margin: float
    notes: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class BudgetParametersUpdate(BaseModel):
    electricity_price_kwh: float
    error_margin_percent: float

    model_config = {"extra": "forbid"}

    @field_validator("electricity_price_kwh")
    @classmethod
    def electricity_positive(cls, v: float) -> float:
        if v <= 0 or v > 10000:
            raise ValueError("electricity_price_kwh must be greater than 0 and at most 10000")
        return v

    @field_validator("error_margin_percent")
    @classmethod
    def error_margin_range(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("error_margin_percent must be between 0 and 100")
        return v


class BudgetParametersResponse(BaseModel):
    currency: str
    electricity_price_kwh: float
    error_margin_percent: float
    is_default: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class BudgetParametersBundle(BaseModel):
    parameters: dict[str, BudgetParametersResponse]
