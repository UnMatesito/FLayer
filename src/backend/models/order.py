import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text, func, text
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("order_category IN ('print', 'product')", name="ck_orders_order_category_valid"),
        CheckConstraint(
            "type_of_delivery IN ('Presencial acordado', 'Delivery')",
            name="ck_orders_delivery_type_valid",
        ),
        CheckConstraint("delivery_embalaje >= 0", name="ck_orders_delivery_embalaje_non_negative"),
        CheckConstraint("delivery_precio_envio >= 0", name="ck_orders_delivery_envio_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    work_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    files: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, default=None)
    status: Mapped[str] = mapped_column(String(50), ForeignKey("order_statuses.name"), nullable=False, default="new")
    client_notified: Mapped[bool] = mapped_column(default=False)
    order_category: Mapped[str] = mapped_column(
        String(20), nullable=False, default="print", server_default="print"
    )
    needs_3d_printing: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default=text("false")
    )
    needs_3d_modelling: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default=text("false")
    )
    dimensions: Mapped[str | None] = mapped_column(Text, nullable=True)
    type_of_delivery: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Presencial acordado", server_default="Presencial acordado"
    )
    delivery_embalaje: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    delivery_precio_envio: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    filament_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("filaments.id"), nullable=True
    )
    grams_estimated: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    fixed_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("fixed_products.id"), nullable=True
    )
    line_items: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, default=None)
    total: Mapped[float | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship(foreign_keys=[customer_id])  # noqa: F821


class OrderNote(Base):
    __tablename__ = "order_notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
