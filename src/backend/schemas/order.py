from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator, model_validator

DELIVERY_TYPES = ("Presencial acordado", "Delivery")


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
    order_category: Literal["print", "product"]
    needs_3d_printing: bool = False
    needs_3d_modelling: bool = False
    dimensions: str | None = None
    type_of_delivery: Literal["Presencial acordado", "Delivery"]

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

    @field_validator("dimensions")
    @classmethod
    def strip_dimensions(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_print_services(self) -> "OrderCreate":
        if self.order_category == "print" and not (
            self.needs_3d_printing or self.needs_3d_modelling
        ):
            raise ValueError(
                "print orders require at least one of needs_3d_printing "
                "or needs_3d_modelling"
            )
        if self.order_category == "product":
            self.needs_3d_printing = False
            self.needs_3d_modelling = False
        return self


class OrderResponse(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str | None = None
    work_type: str
    description: str
    files: list[dict[str, Any]] | None
    status: str
    client_notified: bool
    order_category: str
    needs_3d_printing: bool
    needs_3d_modelling: bool
    dimensions: str | None = None
    type_of_delivery: str
    delivery_embalaje: float | None = None
    delivery_precio_envio: float | None = None
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


class DeliveryCostUpdate(BaseModel):
    embalaje: float
    precio_envio: float

    @field_validator("embalaje", "precio_envio")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("must be non-negative")
        return v
