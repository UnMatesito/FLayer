import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Printer(Base):
    __tablename__ = "printers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nozzle_sizes: Mapped[list | None] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )
    power_watts: Mapped[float | None] = mapped_column(Numeric(7, 2), nullable=True)
    lifespan_hours: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    spare_parts_cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("power_watts >= 0", name="ck_printers_power_watts_non_negative"),
        CheckConstraint("lifespan_hours >= 0", name="ck_printers_lifespan_hours_non_negative"),
        CheckConstraint("spare_parts_cost >= 0", name="ck_printers_spare_parts_cost_non_negative"),
        Index("ix_printers_user_active", "user_id", "is_active"),
        Index(
            "uq_printers_user_name_active",
            "user_id",
            func.lower(name),
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )


class PrinterMaintenance(Base):
    __tablename__ = "printer_maintenance"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    printer_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("printers.id"), nullable=False
    )
    maintenance_type: Mapped[str] = mapped_column(String(20), nullable=False)
    maintenance_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    cost: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("cost >= 0", name="ck_printer_maintenance_cost_non_negative"),
        Index(
            "ix_printer_maintenance_user_printer_date",
            "user_id",
            "printer_id",
            text("maintenance_date DESC"),
        ),
        Index("ix_printer_maintenance_printer", "printer_id"),
    )
