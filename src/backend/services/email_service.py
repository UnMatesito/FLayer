import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage

from backend.config import settings
from backend.models.order import Order


class EmailService(ABC):
    @abstractmethod
    async def send_order_received(self, order: Order, to: str) -> None:
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


email_service: EmailService = SmtpEmailService()
