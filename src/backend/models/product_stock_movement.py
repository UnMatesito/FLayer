import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ProductStockMovement(Base):
    __tablename__ = "product_stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("fixed_products.id"), nullable=False
    )
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("orders.id"), nullable=True
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now()
    )
