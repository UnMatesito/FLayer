from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, field_validator

from backend.services.printer_service import validate_nozzle_sizes


class PrinterCreate(BaseModel):
    name: str
    brand: str | None = None
    model: str | None = None
    nozzle_sizes: list[str] = []
    power_watts: float | None = None
    lifespan_hours: float | None = None
    spare_parts_cost: float | None = None
    image_url: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name must not be empty")
        return stripped

    @field_validator("brand", "model")
    @classmethod
    def brand_model_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if len(stripped) > 100:
            raise ValueError("brand and model must be at most 100 characters")
        return stripped if stripped else None

    @field_validator("nozzle_sizes")
    @classmethod
    def nozzle_sizes_valid(cls, v: list[str]) -> list[str]:
        return validate_nozzle_sizes(v)

    @field_validator("power_watts")
    @classmethod
    def power_watts_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("power_watts must not be negative")
        return v

    @field_validator("lifespan_hours")
    @classmethod
    def lifespan_hours_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("lifespan_hours must not be negative")
        return v

    @field_validator("spare_parts_cost")
    @classmethod
    def spare_parts_cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("spare_parts_cost must not be negative")
        return v

    @field_validator("image_url")
    @classmethod
    def image_url_valid(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 500:
            raise ValueError("image_url must be at most 500 characters")
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("image_url must be a valid http(s) URL")
        return v


class PrinterUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    model: str | None = None
    nozzle_sizes: list[str] | None = None
    power_watts: float | None = None
    lifespan_hours: float | None = None
    spare_parts_cost: float | None = None
    image_url: str | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name must not be empty")
            return stripped
        return v

    @field_validator("brand", "model")
    @classmethod
    def brand_model_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        if len(stripped) > 100:
            raise ValueError("brand and model must be at most 100 characters")
        return stripped if stripped else None

    @field_validator("nozzle_sizes")
    @classmethod
    def nozzle_sizes_valid(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            return validate_nozzle_sizes(v)
        return v

    @field_validator("power_watts")
    @classmethod
    def power_watts_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("power_watts must not be negative")
        return v

    @field_validator("lifespan_hours")
    @classmethod
    def lifespan_hours_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("lifespan_hours must not be negative")
        return v

    @field_validator("spare_parts_cost")
    @classmethod
    def spare_parts_cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("spare_parts_cost must not be negative")
        return v

    @field_validator("image_url")
    @classmethod
    def image_url_valid(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) > 500:
            raise ValueError("image_url must be at most 500 characters")
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("image_url must be a valid http(s) URL")
        return v


class PrinterResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    brand: str | None = None
    model: str | None = None
    nozzle_sizes: list[str] = []
    power_watts: float | None = None
    lifespan_hours: float | None = None
    spare_parts_cost: float | None = None
    image_url: str | None = None
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceCreate(BaseModel):
    maintenance_type: Literal["calibration", "cleaning", "repair"]
    maintenance_date: date
    description: str
    cost: float | None = None

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Description must not be empty")
        return stripped

    @field_validator("cost")
    @classmethod
    def cost_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("cost must not be negative")
        return v


class MaintenanceResponse(BaseModel):
    id: UUID
    printer_id: UUID
    maintenance_type: str
    maintenance_date: date
    description: str
    cost: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
