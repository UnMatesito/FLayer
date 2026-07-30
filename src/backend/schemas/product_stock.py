from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProductStockMovementResponse(BaseModel):
    id: UUID
    product_id: UUID
    movement_type: str
    quantity: float
    order_id: UUID | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductStockAdjust(BaseModel):
    delta_quantity: float
    notes: str | None = None


class ProductStockAdjustResponse(BaseModel):
    id: UUID
    stock_quantity: float
    movement_id: UUID
