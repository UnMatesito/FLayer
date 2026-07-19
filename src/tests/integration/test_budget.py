from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from backend.models.budget import Budget
from backend.models.order import Order
from backend.services.email_service import email_service
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.stock_factories import FilamentFactory


@pytest.fixture(autouse=True)
def mock_email():
    original = email_service.send_budget_provided
    email_service.send_budget_provided = AsyncMock()
    yield
    email_service.send_budget_provided = original


class TestCreateBudget:
    def test_create_budget_with_filament_items(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        filament = FilamentFactory.create(
            session=db_session, user_id=test_user.id, price_per_kg=17000.00
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 50.00}
                ],
                "hours": 4,
                "minutes": 30,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["filament_items"]) == 1
        assert float(data["filament_items"][0]["cost"]) == 850.00
        assert float(data["filament_items"][0]["price_per_kg"]) == 17000.00

    def test_create_budget_manual_filament_cost(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 5000.00,
                "hours": 2,
                "minutes": 0,
                "margin_type": "retail",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["manual_filament_cost"] == 5000.00

    def test_create_budget_no_filaments(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [],
                "manual_filament_cost": None,
                "hours": 1,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_budget_grams_zero(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": "00000000-0000-0000-0000-000000000001", "grams": 0}
                ],
                "hours": 1,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_budget_extra_costs_negative(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": "00000000-0000-0000-0000-000000000001", "grams": 50}
                ],
                "extra_costs": -10.00,
                "hours": 1,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_budget_negative_hours(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": "00000000-0000-0000-0000-000000000001", "grams": 50}
                ],
                "hours": -1,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_budget_calculates_correctly(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        filament = FilamentFactory.create(
            session=db_session, user_id=test_user.id, price_per_kg=17000.00
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 50.00},
                    {"product_id": str(filament.id), "grams": 30.00},
                ],
                "hours": 4,
                "minutes": 30,
                "margin_type": "retail",
                "extra_costs": 0.00,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()

        assert float(data["filament_total"]) == 1360.00
        assert float(data["electricity_cost"]) == 75.60
        assert float(data["amortization_cost"]) == 156.25
        assert float(data["subtotal"]) == pytest.approx(1591.85, rel=0.01)
        assert float(data["subtotal_with_error"]) == pytest.approx(1671.44, rel=0.01)
        assert float(data["total_before_margin"]) == pytest.approx(1671.44, rel=0.01)
        assert float(data["final_price"]) == pytest.approx(6685.76, rel=0.01)

class TestUpdateBudget:
    def test_update_budget_recalculates(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        filament = FilamentFactory.create(
            session=db_session, user_id=test_user.id, price_per_kg=17000.00
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 50.00}
                ],
                "hours": 2,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        budget_id = resp.json()["id"]

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 100.00}
                ],
                "hours": 2,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == budget_id
        assert float(data["filament_total"]) > 0
        assert float(data["filament_total"]) == 1700.00

    def test_manual_price_override(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 1,
                "margin_type": "retail",
                "manual_price": 5000.00,
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert float(data["final_price"]) == 5000.00
        assert data["manual_price"] == 5000.00

    def test_filament_price_snapshot(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        filament = FilamentFactory.create(
            session=db_session, user_id=test_user.id, price_per_kg=17000.00
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 50.00}
                ],
                "hours": 1,
                "margin_type": "retail",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert float(data["filament_items"][0]["price_per_kg"]) == 17000.00

        filament.price_per_kg = 99999.00
        db_session.flush()

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["filament_items"][0]["price_per_kg"]) == 17000.00


class TestGetBudget:
    def test_get_budget_nonexistent_order(self, client, auth_headers):
        resp = client.get(
            "/api/orders/00000000-0000-0000-0000-000000000000/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_get_budget_no_budget(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_budget_response_has_computed_fields(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 1,
                "margin_type": "retail",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "filament_total" in data
        assert "electricity_cost" in data
        assert "amortization_cost" in data
        assert "subtotal" in data
        assert "subtotal_with_error" in data
        assert "total_before_margin" in data
        assert "ml_price" in data
        assert float(data["ml_price"]) == pytest.approx(float(data["final_price"]) * 1.30, rel=0.01)


class TestBudgetPreview:
    def test_budget_preview_no_persist(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget/preview",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 1,
                "margin_type": "retail",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        result = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        )
        budgets = result.scalars().all()
        assert len(budgets) == 0
