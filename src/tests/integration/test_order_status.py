from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from backend.models.order import Order
from backend.services.email_service import email_service
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory


@pytest.fixture(autouse=True)
def mock_email():
    original = email_service.send_order_status_change
    email_service.send_order_status_change = AsyncMock()
    yield
    email_service.send_order_status_change = original


class TestOrderDetail:
    def test_order_detail_returns_customer_info(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id
        )

        resp = client.get(f"/api/orders/{order.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["customer_name"] == customer.name
        assert data["customer_email"] == customer.email
        assert data["id"] == str(order.id)
        assert data["status"] == "new"

    def test_order_detail_not_found(
        self, client, auth_headers
    ):
        resp = client.get(
            "/api/orders/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestUpdateStatus:
    def test_new_to_in_progress(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="new"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "in_progress"

        result = db_session.execute(select(Order).where(Order.id == order.id))
        updated = result.scalar_one()
        assert updated.status == "in_progress"

    def test_in_progress_to_ready(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="in_progress"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "ready"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"

    def test_ready_to_delivered(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="ready"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "delivered"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "delivered"

    def test_new_to_cancelled(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="new"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "cancelled"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_new_to_delivered_invalid(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="new"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "delivered"},
            headers=auth_headers,
        )
        assert resp.status_code == 409

    def test_delivered_to_anything_invalid(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="delivered"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 409

    def test_cancelled_to_anything_invalid(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="cancelled"
        )

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 409

    def test_status_change_sends_email(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(
            session=db_session, user_id=test_user.id, email="client@example.com"
        )
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="new"
        )

        email_service.send_order_status_change = AsyncMock()

        resp = client.patch(
            f"/api/orders/{order.id}/status",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        email_service.send_order_status_change.assert_awaited_once_with(
            order, "in_progress", "client@example.com"
        )


class TestListOrderStatuses:
    def test_order_statuses_seeded(
        self, client, db_session, auth_headers, test_user
    ):
        resp = client.get("/api/order-statuses", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        names = {s["name"] for s in data}
        assert names == {"new", "in_progress", "ready", "delivered", "cancelled"}
