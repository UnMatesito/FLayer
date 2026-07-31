from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name must not be empty")
        return stripped


class FileInfo(BaseModel):
    filename: str
    url: str


class LineItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer: CustomerCreate
    work_type: str
    description: str
    files: list[FileInfo] | None = None
    skip_client_notification: bool = False
    status: str | None = None
    fixed_product_id: UUID | None = None
    line_items: list[LineItem] | None = None
    total: float | None = None

    @field_validator("work_type")
    @classmethod
    def valid_work_type(cls, v: str, info) -> str:
        allowed = {"impresion_3d", "diseno_3d", "product"}
        if v not in allowed:
            raise ValueError(f"work_type must be one of: {', '.join(allowed)}")
        return v

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Description must not be empty")
        return stripped


class OrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    work_type: str
    description: str
    files: list[dict[str, Any]] | None
    status: str
    client_notified: bool
    filament_id: UUID | None = None
    grams_estimated: float | None = None
    fixed_product_id: UUID | None = None
    line_items: list[dict[str, Any]] | None = None
    total: float | None = None
    has_budget: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderDetailResponse(OrderResponse):
    customer_name: str
    customer_email: str


class PublicOrderCreate(OrderCreate):
    token: str | None = None
    skip_client_notification: bool = False

    @field_validator("files")
    @classmethod
    def validate_file_sizes(cls, v: list[FileInfo] | None) -> list[FileInfo] | None:
        if v and len(v) > 10:
            raise ValueError("Maximum 10 files per order")
        return v
