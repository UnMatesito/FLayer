from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


VALID_MOVEMENT_TYPES = {"consumption", "adjustment", "reversal"}


class FilamentSettings(BaseModel):
    recommended_nozzle_temp_min: int | None = None
    recommended_nozzle_temp_max: int | None = None
    flow_ratio: float | None = None
    nozzle_temperature: int | None = None
    max_volumetric_speed: float | None = None
    pressure_advance: float | None = None
    nominal_diameter: float | None = None
    plate_temperature: int | None = None


class FilamentCreate(BaseModel):
    color_name: str
    color_hex: str
    brand: str = ""
    filament_type: str
    weight_grams: float = 0
    price_per_kg: float = 0
    min_stock_warning_grams: float = 200
    settings: FilamentSettings | None = None

    @field_validator("color_name")
    @classmethod
    def color_name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Color name must not be empty")
        return stripped

    @field_validator("color_hex")
    @classmethod
    def valid_color_hex(cls, v: str) -> str:
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("Color hex must be in format #RRGGBB")
        return v

    @field_validator("filament_type")
    @classmethod
    def filament_type_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Filament type must not be empty")
        return stripped

    @field_validator("weight_grams")
    @classmethod
    def weight_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Weight must not be negative")
        return v

    @field_validator("price_per_kg")
    @classmethod
    def price_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price must not be negative")
        return v


class FilamentResponse(BaseModel):
    id: UUID
    user_id: UUID
    color_name: str
    color_hex: str
    brand: str = ""
    filament_type: str
    weight_grams: float
    price_per_kg: float
    min_stock_warning_grams: float
    settings: dict | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FilamentUpdate(BaseModel):
    color_name: str | None = None
    color_hex: str | None = None
    brand: str | None = None
    filament_type: str | None = None
    price_per_kg: float | None = None
    min_stock_warning_grams: float | None = None
    settings: dict | None = None
    is_active: bool | None = None


class FilamentAdjustRequest(BaseModel):
    delta_grams: float
    notes: str | None = None


class FilamentAdjustResponse(BaseModel):
    id: UUID
    weight_grams: float
    movement_id: UUID


class SupplyCreate(BaseModel):
    name: str
    quantity: float = 0
    unit: str
    min_stock_warning: float = 1

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name must not be empty")
        return stripped

    @field_validator("unit")
    @classmethod
    def unit_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Unit must not be empty")
        return stripped


class SupplyUpdate(BaseModel):
    name: str | None = None
    quantity: float | None = None
    unit: str | None = None
    min_stock_warning: float | None = None
    is_active: bool | None = None


class SupplyResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    quantity: float
    unit: str
    min_stock_warning: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockMovementResponse(BaseModel):
    id: UUID
    filament_id: UUID
    filament_color_name: str | None = None
    movement_type: str
    quantity_grams: float
    order_id: UUID | None = None
    order_reference: str | None = None
    created_by_user_id: UUID
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedStockMovements(BaseModel):
    items: list[StockMovementResponse]
    total: int
    page: int
    per_page: int


class StockMovementFilter(BaseModel):
    filament_id: UUID | None = None
    movement_type: str | None = None
    order_id: UUID | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    per_page: int = 20


class LowStockFilament(BaseModel):
    id: UUID
    color_name: str
    weight_grams: float
    min_stock_warning_grams: float


class LowStockSupply(BaseModel):
    id: UUID
    name: str
    quantity: float
    unit: str
    min_stock_warning: float


class LowStockResponse(BaseModel):
    filaments: list[LowStockFilament]
    supplies: list[LowStockSupply]
