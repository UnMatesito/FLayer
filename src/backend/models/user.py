import uuid

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    logo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="ARS")

    __table_args__ = (
        CheckConstraint("currency IN ('ARS','USD','EUR','BRL','GBP','MXN')", name="ck_users_currency"),
    )
