import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class BudgetParameters(Base):
    __tablename__ = "budget_parameters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("users.id"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    electricity_price_kwh: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    error_margin_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    is_default: Mapped[bool] = mapped_column(
        nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "currency", name="uq_budget_parameters_user_currency"),
        CheckConstraint("currency IN ('ARS','USD','EUR','BRL','GBP','MXN')", name="ck_budget_parameters_currency"),
        CheckConstraint("electricity_price_kwh > 0", name="ck_budget_parameters_electricity_positive"),
        CheckConstraint(
            "error_margin_percent >= 0 AND error_margin_percent <= 100",
            name="ck_budget_parameters_error_margin_range",
        ),
    )
