from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from backend.models.budget import Budget
from backend.models.order import Order
from backend.services.email_service import email_service
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.printer_factory import PrinterFactory
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


class TestBudgetPrinterProfile:
    def test_create_budget_with_printer_profile(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "printer_id": str(printer.id),
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["printer_id"] == str(printer.id)
        assert data["printer_name"] == printer.name
        assert float(data["power_watts"]) == 250.0
        assert float(data["lifespan_hours"]) == 1000.0
        assert float(data["spare_parts_cost"]) == 20000.0
        assert float(data["electricity_cost"]) == pytest.approx(70.0, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(40.0, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert float(row.power_watts) == 250.0
        assert float(row.lifespan_hours) == 1000.0
        assert float(row.spare_parts_cost) == 20000.0

    def test_create_budget_without_printer_uses_defaults(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["printer_id"] is None
        assert data["printer_name"] is None
        assert data["power_watts"] is None
        assert float(data["electricity_cost"]) == pytest.approx(33.60, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(69.44, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.printer_id is None
        assert row.power_watts is None

    def test_create_budget_printer_partial_fields_fallback(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=200,
            lifespan_hours=None,
            spare_parts_cost=None,
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "printer_id": str(printer.id),
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert float(data["power_watts"]) == 200.0
        assert float(data["lifespan_hours"]) == 4320.0
        assert float(data["spare_parts_cost"]) == 150000.0
        assert float(data["electricity_cost"]) == pytest.approx(56.0, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(69.44, rel=0.01)

    def test_create_budget_foreign_printer_404(self, client, db_session, auth_headers, test_user, other_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        foreign_printer = PrinterFactory.create(session=db_session, user_id=other_user.id)

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 1,
                "margin_type": "retail",
                "printer_id": str(foreign_printer.id),
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_create_budget_nonexistent_printer_404(self, client, db_session, auth_headers, test_user):
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
                "printer_id": "00000000-0000-0000-0000-000000000099",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_budget_snapshot_immutable(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "printer_id": str(printer.id),
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        electricity_before = resp.json()["electricity_cost"]

        printer.power_watts = 500
        printer.spare_parts_cost = 99999
        db_session.flush()

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["power_watts"]) == 250.0
        assert float(data["spare_parts_cost"]) == 20000.0
        assert float(data["electricity_cost"]) == electricity_before

    def test_preview_with_printer_profile(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget/preview",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "printer_id": str(printer.id),
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["printer_id"] == str(printer.id)
        assert data["printer_name"] == printer.name
        assert float(data["power_watts"]) == 250.0
        assert float(data["lifespan_hours"]) == 1000.0
        assert float(data["spare_parts_cost"]) == 20000.0
        assert float(data["electricity_cost"]) == pytest.approx(70.0, rel=0.01)

        result = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        )
        assert len(result.scalars().all()) == 0

    def test_get_budget_returns_printer_name(self, client, db_session, auth_headers, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )

        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "printer_id": str(printer.id),
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
        assert data["printer_id"] == str(printer.id)
        assert data["printer_name"] == printer.name
        assert float(data["power_watts"]) == 250.0
        assert float(data["lifespan_hours"]) == 1000.0
        assert float(data["spare_parts_cost"]) == 20000.0


class TestUpdateBudgetPrinterProfile:
    def _make_order(self, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        return OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id, status="quoting"
        )

    def _create_budget(self, client, auth_headers, order_id, **overrides):
        payload = {
            "manual_filament_cost": 1000.00,
            "hours": 2,
            "minutes": 0,
            "extra_costs": 0.00,
            "margin_type": "retail",
            "filament_items": [],
        }
        payload.update(overrides)
        resp = client.post(
            f"/api/orders/{order_id}/budget",
            json=payload,
            headers=auth_headers,
        )
        assert resp.status_code == 201
        return resp.json()

    def test_update_budget_changes_printer_resnapshots(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user)
        printer_a = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )
        printer_b = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=300,
            lifespan_hours=2000,
            spare_parts_cost=50000,
        )
        self._create_budget(client, auth_headers, order.id, printer_id=str(printer_a.id))

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={"printer_id": str(printer_b.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["printer_id"] == str(printer_b.id)
        assert data["printer_name"] == printer_b.name
        assert float(data["power_watts"]) == 300.0
        assert float(data["lifespan_hours"]) == 2000.0
        assert float(data["spare_parts_cost"]) == 50000.0
        assert float(data["electricity_cost"]) == pytest.approx(84.0, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(50.0, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.printer_id == printer_b.id
        assert float(row.power_watts) == 300.0
        assert float(row.lifespan_hours) == 2000.0
        assert float(row.spare_parts_cost) == 50000.0

    def test_update_budget_clears_printer(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user)
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
        )
        self._create_budget(client, auth_headers, order.id, printer_id=str(printer.id))

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={"printer_id": None},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["printer_id"] is None
        assert data["printer_name"] is None
        assert data["power_watts"] is None
        assert data["lifespan_hours"] is None
        assert data["spare_parts_cost"] is None
        assert float(data["electricity_cost"]) == pytest.approx(33.6, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(69.44, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.printer_id is None
        assert row.power_watts is None
        assert row.lifespan_hours is None
        assert row.spare_parts_cost is None

    def test_update_budget_items_only_keeps_snapshot(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user)
        printer = PrinterFactory.create(
            session=db_session,
            user_id=test_user.id,
            power_watts=250,
            lifespan_hours=1000,
            spare_parts_cost=20000,
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
                "printer_id": str(printer.id),
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={
                "filament_items": [
                    {"product_id": str(filament.id), "grams": 100.00}
                ],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["printer_id"] == str(printer.id)
        assert float(data["power_watts"]) == 250.0
        assert float(data["lifespan_hours"]) == 1000.0
        assert float(data["spare_parts_cost"]) == 20000.0
        assert float(data["filament_total"]) == 1700.0
        assert float(data["electricity_cost"]) == pytest.approx(70.0, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(40.0, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.printer_id == printer.id
        assert float(row.power_watts) == 250.0
        assert float(row.lifespan_hours) == 1000.0
        assert float(row.spare_parts_cost) == 20000.0

    def test_update_budget_final_price_recalculated_on_partial_update(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user)
        self._create_budget(client, auth_headers, order.id)

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={"hours": 4},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["electricity_cost"]) == pytest.approx(67.2, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(138.89, rel=0.01)
        assert float(data["final_price"]) == pytest.approx(5065.56, rel=0.01)
        assert float(data["final_price"]) == pytest.approx(
            float(data["total_before_margin"]) * 4.0, rel=0.01
        )

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={"extra_costs": 100.00},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["final_price"]) == pytest.approx(5465.56, rel=0.01)
        assert float(data["final_price"]) == pytest.approx(
            float(data["total_before_margin"]) * 4.0, rel=0.01
        )

        resp = client.put(
            f"/api/orders/{order.id}/budget",
            json={"manual_price": 7000.00},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["final_price"]) == 7000.00
        assert float(data["ml_price"]) == 9100.00

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert float(row.final_price) == pytest.approx(7000.00, rel=0.01)

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert float(resp.json()["final_price"]) == pytest.approx(7000.00, rel=0.01)
