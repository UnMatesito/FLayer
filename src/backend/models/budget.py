import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("orders.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="ARS"
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    filament_items: Mapped[list | None] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    manual_filament_cost: Mapped[float | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    manual_grams: Mapped[float | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    hours: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    minutes: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    extra_costs: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    margin_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="retail"
    )
    error_margin_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    margin_multiplier: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    final_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    manual_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("order_id", "version", name="uq_budget_order_version"),
    )
