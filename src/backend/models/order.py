import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Numeric, String, Text, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=False)
    work_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    files: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, default=None)
    status: Mapped[str] = mapped_column(String(50), ForeignKey("order_statuses.name"), nullable=False, default="new")
    client_notified: Mapped[bool] = mapped_column(default=False)
    filament_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID, ForeignKey("filaments.id"), nullable=True
    )
    grams_estimated: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
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
