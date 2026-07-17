import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, JSON, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Filament(Base):
    __tablename__ = "filaments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    color_name: Mapped[str] = mapped_column(String(100), nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    filament_type: Mapped[str] = mapped_column(String(50), nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    weight_grams: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    price_per_kg: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    min_stock_warning_grams: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=200
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "color_name", "brand", name="uq_filament_user_color_brand"),
    )
