from unittest.mock import AsyncMock

import pytest
from jose import jwt
from sqlalchemy import select

from backend.config import settings
from backend.models.budget import Budget
from backend.models.budget_parameters import BudgetParameters
from backend.services.email_service import email_service
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.user_factory import UserFactory


@pytest.fixture(autouse=True)
def mock_email():
    original = email_service.send_budget_provided
    email_service.send_budget_provided = AsyncMock()
    yield
    email_service.send_budget_provided = original


def _auth_headers_for(user) -> dict:
    token = jwt.encode(
        {"sub": str(user.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


def _valid_payload(**overrides) -> dict:
    payload = {
        "electricity_price_kwh": 180.00,
        "error_margin_percent": 6.00,
        "margin_multiplier_wholesale": 3.50,
        "margin_multiplier_retail": 4.50,
        "margin_multiplier_keychain": 5.50,
    }
    payload.update(overrides)
    return payload


class TestGetBudgetParameters:
    def test_get_parameters_seeded_defaults(self, client, db_session, auth_headers, test_user):
        resp = client.get("/api/budget-parameters", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()["parameters"]

        assert set(data.keys()) == {"ARS", "USD", "EUR", "BRL", "GBP", "MXN"}
        ars = data["ARS"]
        assert ars["electricity_price_kwh"] == 140.00
        assert ars["error_margin_percent"] == 5.00
        assert ars["margin_multiplier_wholesale"] == 3.00
        assert ars["margin_multiplier_retail"] == 4.00
        assert ars["margin_multiplier_keychain"] == 5.00
        assert ars["is_default"] is True

        usd = data["USD"]
        assert usd["electricity_price_kwh"] == 0.15
        assert usd["is_default"] is True

        assert data["EUR"]["electricity_price_kwh"] == 0.25
        assert data["BRL"]["electricity_price_kwh"] == 0.80
        assert data["GBP"]["electricity_price_kwh"] == 0.25
        assert data["MXN"]["electricity_price_kwh"] == 2.50

        rows = db_session.execute(
            select(BudgetParameters).where(BudgetParameters.user_id == test_user.id)
        ).scalars().all()
        assert len(rows) == 6
        assert {row.currency for row in rows} == {"ARS", "USD", "EUR", "BRL", "GBP", "MXN"}
        assert all(row.is_default for row in rows)

    def test_get_parameters_saved_row_wins(self, client, db_session, auth_headers, test_user):
        row = BudgetParameters(
            user_id=test_user.id,
            currency="ARS",
            electricity_price_kwh=900.00,
            error_margin_percent=1.00,
            margin_multiplier_wholesale=2.00,
            margin_multiplier_retail=2.00,
            margin_multiplier_keychain=2.00,
            is_default=False,
        )
        db_session.add(row)
        db_session.flush()

        resp = client.get("/api/budget-parameters", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()["parameters"]
        assert data["ARS"]["electricity_price_kwh"] == 900.00
        assert data["ARS"]["is_default"] is False
        assert data["USD"]["electricity_price_kwh"] == 0.15
        assert data["USD"]["is_default"] is True


class TestPutBudgetParameters:
    def test_put_parameters_creates_row(self, client, db_session, auth_headers, test_user):
        resp = client.put(
            "/api/budget-parameters/USD",
            json=_valid_payload(electricity_price_kwh=0.30),
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["currency"] == "USD"
        assert data["electricity_price_kwh"] == 0.30
        assert data["is_default"] is False

        row = db_session.execute(
            select(BudgetParameters).where(
                BudgetParameters.user_id == test_user.id,
                BudgetParameters.currency == "USD",
            )
        ).scalar_one()
        assert float(row.electricity_price_kwh) == 0.30
        assert row.is_default is False

        resp = client.get("/api/budget-parameters", headers=auth_headers)
        assert resp.json()["parameters"]["USD"]["electricity_price_kwh"] == 0.30
        assert resp.json()["parameters"]["USD"]["is_default"] is False

    def test_put_parameters_updates_row(self, client, db_session, auth_headers, test_user):
        first = client.put(
            "/api/budget-parameters/ARS",
            json=_valid_payload(electricity_price_kwh=200.00),
            headers=auth_headers,
        )
        assert first.status_code == 200
        first_data = first.json()

        second = client.put(
            "/api/budget-parameters/ARS",
            json=_valid_payload(electricity_price_kwh=250.00, error_margin_percent=8.00),
            headers=auth_headers,
        )
        assert second.status_code == 200
        second_data = second.json()

        assert second_data["created_at"] == first_data["created_at"]
        assert second_data["electricity_price_kwh"] == 250.00
        assert second_data["error_margin_percent"] == 8.00
        assert second_data["is_default"] is False
        assert second_data["updated_at"] >= second_data["created_at"]

        rows = db_session.execute(
            select(BudgetParameters).where(
                BudgetParameters.user_id == test_user.id,
                BudgetParameters.currency == "ARS",
            )
        ).scalars().all()
        assert len(rows) == 1
        assert float(rows[0].electricity_price_kwh) == 250.00

    def test_put_parameters_missing_field_422(self, client, auth_headers):
        resp = client.put(
            "/api/budget-parameters/ARS",
            json={
                "electricity_price_kwh": 180.00,
                "error_margin_percent": 6.00,
                "margin_multiplier_wholesale": 3.50,
                "margin_multiplier_retail": 4.50,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_put_parameters_zero_or_negative_422(self, client, auth_headers):
        for payload in (
            _valid_payload(electricity_price_kwh=0),
            _valid_payload(electricity_price_kwh=-10),
            _valid_payload(margin_multiplier_wholesale=0),
            _valid_payload(margin_multiplier_retail=-1),
            _valid_payload(margin_multiplier_keychain=0),
        ):
            resp = client.put(
                "/api/budget-parameters/ARS",
                json=payload,
                headers=auth_headers,
            )
            assert resp.status_code == 422

    def test_put_parameters_out_of_range_422(self, client, auth_headers):
        for payload in (
            _valid_payload(electricity_price_kwh=10000.01),
            _valid_payload(error_margin_percent=100.01),
            _valid_payload(error_margin_percent=-0.01),
            _valid_payload(margin_multiplier_wholesale=100.01),
            _valid_payload(margin_multiplier_retail=100.01),
            _valid_payload(margin_multiplier_keychain=100.01),
        ):
            resp = client.put(
                "/api/budget-parameters/ARS",
                json=payload,
                headers=auth_headers,
            )
            assert resp.status_code == 422

    def test_put_parameters_invalid_currency_422(self, client, auth_headers):
        resp = client.put(
            "/api/budget-parameters/JPY",
            json=_valid_payload(),
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_parameters_tenant_isolation(self, client, db_session, auth_headers, test_user):
        other_user = UserFactory.create(session=db_session, name="Other")
        other_headers = _auth_headers_for(other_user)

        resp = client.put(
            "/api/budget-parameters/ARS",
            json=_valid_payload(electricity_price_kwh=999.00),
            headers=auth_headers,
        )
        assert resp.status_code == 200

        resp = client.get("/api/budget-parameters", headers=other_headers)
        assert resp.status_code == 200
        other_data = resp.json()["parameters"]
        assert other_data["ARS"]["electricity_price_kwh"] == 140.00
        assert other_data["ARS"]["is_default"] is True

        resp = client.put(
            "/api/budget-parameters/USD",
            json=_valid_payload(electricity_price_kwh=0.60),
            headers=other_headers,
        )
        assert resp.status_code == 200

        rows = db_session.execute(
            select(BudgetParameters).where(BudgetParameters.user_id == test_user.id)
        ).scalars().all()
        assert len(rows) == 1
        assert rows[0].currency == "ARS"
        assert float(rows[0].electricity_price_kwh) == 999.00

        resp = client.get("/api/budget-parameters", headers=auth_headers)
        data = resp.json()["parameters"]
        assert data["ARS"]["electricity_price_kwh"] == 999.00
        assert data["USD"]["is_default"] is True


class TestBudgetParametersBudgetIntegration:
    def _make_order(self, db_session, user_id):
        customer = CustomerFactory.create(session=db_session, user_id=user_id)
        return OrderFactory.create(
            session=db_session, user_id=user_id, customer_id=customer.id, status="quoting"
        )

    def test_budget_uses_configured_parameters(self, client, db_session, auth_headers, test_user):
        resp = client.put(
            "/api/budget-parameters/ARS",
            json=_valid_payload(
                electricity_price_kwh=280.00,
                error_margin_percent=10.00,
                margin_multiplier_retail=5.00,
            ),
            headers=auth_headers,
        )
        assert resp.status_code == 200

        order = self._make_order(db_session, test_user.id)
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
        assert float(data["electricity_cost"]) == pytest.approx(67.2, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(69.44, rel=0.01)
        assert data["error_margin_percent"] == 10.00
        assert data["margin_multiplier"] == 5.00
        assert float(data["final_price"]) == pytest.approx(
            float(data["total_before_margin"]) * 5.0, rel=0.01
        )

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert float(row.electricity_price_kwh) == 280.00
        assert float(row.error_margin_percent) == 10.00
        assert float(row.margin_multiplier) == 5.00

    def test_budget_uses_seeded_values_when_unconfigured(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user.id)
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
        assert float(data["electricity_cost"]) == pytest.approx(33.6, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(69.44, rel=0.01)
        assert data["error_margin_percent"] == 5.00
        assert data["margin_multiplier"] == 4.00

    def test_budget_snapshot_immutable(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user.id)
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
        first = resp.json()
        assert float(first["electricity_cost"]) == pytest.approx(33.6, rel=0.01)

        resp = client.put(
            "/api/budget-parameters/ARS",
            json=_valid_payload(electricity_price_kwh=280.00, margin_multiplier_retail=7.00),
            headers=auth_headers,
        )
        assert resp.status_code == 200

        resp = client.get(
            f"/api/orders/{order.id}/budget",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        after = resp.json()
        assert float(after["electricity_cost"]) == pytest.approx(33.6, rel=0.01)
        assert after["error_margin_percent"] == 5.00
        assert after["margin_multiplier"] == 4.00
        assert float(after["final_price"]) == float(first["final_price"])

    def test_budget_currency_defaults_to_user_currency(self, client, db_session, auth_headers, test_user):
        test_user.currency = "USD"
        db_session.flush()

        order = self._make_order(db_session, test_user.id)
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
        assert data["currency"] == "USD"
        assert float(data["electricity_cost"]) == pytest.approx(0.04, abs=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(0.16, rel=0.01)

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.currency == "USD"

    def test_budget_explicit_currency_respected(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user.id)
        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "currency": "USD",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["currency"] == "USD"
        assert float(data["electricity_cost"]) == pytest.approx(0.04, abs=0.01)

        resp = client.post(
            f"/api/orders/{order.id}/budget/preview",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "currency": "USD",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["currency"] == "USD"

    def test_budget_new_currency_uses_seeded_parameters(self, client, db_session, auth_headers, test_user):
        order = self._make_order(db_session, test_user.id)
        resp = client.post(
            f"/api/orders/{order.id}/budget",
            json={
                "manual_filament_cost": 1000.00,
                "hours": 2,
                "margin_type": "retail",
                "currency": "MXN",
                "filament_items": [],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["currency"] == "MXN"
        assert float(data["electricity_cost"]) == pytest.approx(0.6, rel=0.01)
        assert float(data["amortization_cost"]) == pytest.approx(3.2, rel=0.01)
        assert data["error_margin_percent"] == 5.00
        assert data["margin_multiplier"] == 4.00

        row = db_session.execute(
            select(Budget).where(Budget.order_id == order.id)
        ).scalar_one()
        assert row.currency == "MXN"
        assert float(row.electricity_price_kwh) == 2.50


class TestUserCurrency:
    def test_get_me_includes_currency(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["currency"] == "ARS"

    def test_patch_me_currency(self, client, db_session, auth_headers, test_user):
        resp = client.patch("/api/auth/me", json={"currency": "USD"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["currency"] == "USD"

        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["currency"] == "USD"

        row = db_session.execute(select(type(test_user)).where(type(test_user).id == test_user.id)).scalar_one()
        assert row.currency == "USD"

    def test_patch_me_invalid_currency_422(self, client, auth_headers):
        resp = client.patch("/api/auth/me", json={"currency": "JPY"}, headers=auth_headers)
        assert resp.status_code == 422

    def test_patch_me_new_currency_accepted(self, client, db_session, auth_headers, test_user):
        resp = client.patch("/api/auth/me", json={"currency": "EUR"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["currency"] == "EUR"

        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.json()["currency"] == "EUR"

    def test_patch_me_unknown_field_still_rejected(self, client, auth_headers):
        resp = client.patch("/api/auth/me", json={"currency": "USD", "email": "x@y.z"}, headers=auth_headers)
        assert resp.status_code == 422
