import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage
from typing import Any

from backend.config import settings
from backend.models.order import Order


class EmailService(ABC):
    @abstractmethod
    async def send_order_received(self, order: Order, to: str) -> None:
        ...

    @abstractmethod
    async def send_otp(self, to: str, code: str) -> None:
        ...

    @abstractmethod
    async def send_order_status_change(self, order: Order, new_status: str, to: str) -> None:
        ...

    @abstractmethod
    async def send_budget_provided(self, order: Order, budget: Any, to: str | None) -> None:
        ...


class SmtpEmailService(EmailService):
    def __init__(self) -> None:
        self._host = settings.smtp_host
        self._port = settings.smtp_port
        self._from_email = settings.smtp_from_email

    async def send_order_received(self, order: Order, to: str) -> None:
        msg = EmailMessage()
        msg["Subject"] = f"Order {order.id} Received"
        msg["From"] = self._from_email
        msg["To"] = to
        msg.set_content(
            f"Hi,\n\n"
            f"Your order {order.id} has been received and is being reviewed.\n"
            f"Work type: {order.work_type}\n"
            f"Status: {order.status}\n\n"
            f"We'll be in touch soon.\n\n"
            f"— Flayer Team"
        )
        with smtplib.SMTP(self._host, self._port) as server:
            server.send_message(msg)

    async def send_otp(self, to: str, code: str) -> None:
        msg = EmailMessage()
        msg["Subject"] = "Your verification code"
        msg["From"] = self._from_email
        msg["To"] = to
        msg.set_content(
            f"Your verification code is: {code}\n\n"
            f"This code expires in 10 minutes.\n\n"
            f"— Flayer Team"
        )
        with smtplib.SMTP(self._host, self._port) as server:
            server.send_message(msg)

    async def send_order_status_change(self, order: Order, new_status: str, to: str) -> None:
        msg = EmailMessage()
        msg["Subject"] = f"Order {order.id} — Status Update"
        msg["From"] = self._from_email
        msg["To"] = to
        msg.set_content(
            f"Hi,\n\n"
            f"Your order {order.id} has been updated.\n"
            f"New status: {new_status}\n\n"
            f"Thank you,\n"
            f"— Flayer Team"
        )
        with smtplib.SMTP(self._host, self._port) as server:
            server.send_message(msg)

    async def send_budget_provided(self, order: Order, budget: Any, to: str | None) -> None:
        logger = __import__("logging").getLogger(__name__)
        logger.info("Budget %s provided for order %s (stub)", budget.id, order.id)


email_service: EmailService = SmtpEmailService()
