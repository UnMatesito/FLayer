from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class ProductCreate(BaseModel):
    name: str
    price: float
    description: str | None = None
    image_url: str | None = None
    stock_quantity: float = 0

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name must not be empty")
        return stripped

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price must not be negative")
        return v


class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    description: str | None = None
    image_url: str | None = None
    stock_quantity: float | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name must not be empty")
            return stripped
        return v

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Price must not be negative")
        return v


class ProductResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: str | None = None
    price: float
    stock_quantity: float
    image_url: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
