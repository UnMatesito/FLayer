from typing import Any
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator


VALID_MARGIN_TYPES = {"wholesale", "retail", "keychain"}


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
    currency: str = "ARS"
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    filament_items: list[FilamentItemInput] = []
    hours: int = 0
    minutes: int = 0
    margin_type: str = "retail"
    extra_costs: float = 0.0
    manual_price: float | None = None
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str) -> str:
        allowed = {"ARS", "USD"}
        if v not in allowed:
            raise ValueError("currency must be ARS or USD")
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
        if v < 0:
            raise ValueError("extra_costs must be >= 0")
        return v

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
        return self


class BudgetUpdate(BaseModel):
    currency: str | None = None
    filament_items: list[FilamentItemInput] | None = None
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int | None = None
    minutes: int | None = None
    margin_type: str | None = None
    extra_costs: float | None = None
    manual_price: float | None = None
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str | None) -> str | None:
        if v is not None:
            allowed = {"ARS", "USD"}
            if v not in allowed:
                raise ValueError("currency must be ARS or USD")
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
        if v is not None and v < 0:
            raise ValueError("extra_costs must be >= 0")
        return v

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


class BudgetPreviewRequest(BaseModel):
    currency: str = "ARS"
    filament_items: list[FilamentItemInput] = []
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int = 0
    minutes: int = 0
    margin_type: str = "retail"
    extra_costs: float = 0.0
    manual_price: float | None = None

    @field_validator("currency")
    @classmethod
    def valid_currency(cls, v: str) -> str:
        allowed = {"ARS", "USD"}
        if v not in allowed:
            raise ValueError("currency must be ARS or USD")
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
        if v < 0:
            raise ValueError("extra_costs must be >= 0")
        return v

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


class BudgetResponse(BaseModel):
    id: UUID
    order_id: UUID
    version: int
    currency: str
    filament_items: list[dict[str, Any]]
    manual_filament_cost: float | None = None
    manual_grams: float | None = None
    hours: int
    minutes: int
    margin_type: str
    extra_costs: float
    error_margin_percent: float
    margin_multiplier: float
    final_price: float
    manual_price: float | None = None
    ml_price: float
    filament_total: float
    electricity_cost: float
    amortization_cost: float
    subtotal: float
    subtotal_with_error: float
    total_before_margin: float
    notes: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
