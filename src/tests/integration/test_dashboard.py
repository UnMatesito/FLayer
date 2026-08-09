from datetime import datetime, timedelta, timezone

from jose import jwt

from backend.config import settings
from tests.factories.budget_factory import BudgetFactory
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.printer_factory import PrinterFactory, PrinterMaintenanceFactory
from tests.factories.stock_factories import FilamentFactory, SupplyFactory
from tests.factories.user_factory import UserFactory


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _last_month() -> datetime:
    now = _now()
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    return month_start - timedelta(minutes=1)


def _days_ago(days: float) -> datetime:
    return _now() - timedelta(days=days)


def _token_for(user) -> str:
    return jwt.encode(
        {"sub": str(user.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


class TestSummaryAuth:
    def test_summary_requires_auth(self, client):
        response = client.get("/api/dashboard/summary")
        assert response.status_code == 401


class TestSummaryKpis:
    def test_summary_kpis_computed(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        now = _now()

        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=now,
        )
        o_quoting = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="quoting", created_at=now,
        )
        BudgetFactory.create(session=db_session, user_id=test_user.id, order_id=o_quoting.id, final_price=1000.00)
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="printing", created_at=now,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="ready", created_at=now,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="delivered", created_at=now, total=200.00,
        )
        o_cancelled = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="cancelled", created_at=now,
        )
        BudgetFactory.create(session=db_session, user_id=test_user.id, order_id=o_cancelled.id, final_price=500.00)

        FilamentFactory.create(
            session=db_session, user_id=test_user.id,
            weight_grams=50.00, min_stock_warning_grams=200.00,
        )
        FilamentFactory.create(session=db_session, user_id=test_user.id, weight_grams=1000.00)
        SupplyFactory.create(
            session=db_session, user_id=test_user.id,
            quantity=0.5, min_stock_warning=1.0,
        )
        SupplyFactory.create(session=db_session, user_id=test_user.id, quantity=5.0)

        active_1 = PrinterFactory.create(session=db_session, user_id=test_user.id, name="One")
        active_2 = PrinterFactory.create(session=db_session, user_id=test_user.id, name="Two")
        PrinterFactory.create(session=db_session, user_id=test_user.id, name="Archived", is_active=False)
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id,
            printer_id=active_1.id, maintenance_date=_now().date(),
        )
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id,
            printer_id=active_2.id, maintenance_date=_now().date(),
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        kpis = data["kpis"]
        assert kpis["orders_month"] == 6
        assert kpis["revenue_month"] == 1200.0
        assert kpis["pending_orders"] == 2
        assert kpis["printing_orders"] == 1
        assert kpis["budgeted_value_quoting"] == 1000.0
        assert kpis["low_stock_filaments"] == 1
        assert kpis["low_stock_supplies"] == 1
        assert kpis["printers_active"] == 2
        assert kpis["maintenance_month"] == 2

        assert "as_of" in data
        assert len(data["activity"]) == 14
        assert data["activity"][-1]["date"] == _now().date().isoformat()
        assert data["activity"][-1]["orders"] == 5
        assert data["activity"][-1]["revenue"] == 1200.0
        assert len(data["recent_orders"]) == 5
        assert data["low_stock"]["filaments"][0]["color_name"].startswith("PLA")
        assert data["low_stock"]["supplies"][0]["name"].startswith("Isopropyl")
        assert len(data["printers"]) == 2
        assert data["printers"][0]["maintenance_month"] == 1

    def test_summary_month_boundary(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_last_month(), total=999.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(), total=500.00,
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        kpis = response.json()["kpis"]
        assert kpis["orders_month"] == 1
        assert kpis["revenue_month"] == 500.0


class TestTenantIsolation:
    def test_summary_tenant_isolation(self, client, auth_headers, db_session, test_user, other_user):
        customer = CustomerFactory.create(session=db_session, user_id=other_user.id)
        o_foreign = OrderFactory.create(
            session=db_session, user_id=other_user.id, customer_id=customer.id,
            status="printing", created_at=_now(), total=777.00,
        )
        BudgetFactory.create(
            session=db_session, user_id=other_user.id, order_id=o_foreign.id, final_price=888.00,
        )
        FilamentFactory.create(
            session=db_session, user_id=other_user.id,
            weight_grams=10.00, min_stock_warning_grams=200.00,
        )
        SupplyFactory.create(
            session=db_session, user_id=other_user.id,
            quantity=0.1, min_stock_warning=1.0,
        )
        p = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=other_user.id, printer_id=p.id, maintenance_date=_now().date(),
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        kpis = data["kpis"]
        assert kpis == {
            "orders_month": 0,
            "revenue_month": 0.0,
            "pending_orders": 0,
            "printing_orders": 0,
            "budgeted_value_quoting": 0.0,
            "low_stock_filaments": 0,
            "low_stock_supplies": 0,
            "printers_active": 0,
            "maintenance_month": 0,
        }
        assert data["recent_orders"] == []
        assert data["low_stock"]["filaments"] == []
        assert data["low_stock"]["supplies"] == []
        assert data["printers"] == []
        assert all(point["orders"] == 0 and point["revenue"] == 0.0 for point in data["activity"])


class TestRevenue:
    def test_revenue_budget_overrides_total(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        o_budget = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(),
        )
        BudgetFactory.create(
            session=db_session, user_id=test_user.id, order_id=o_budget.id, final_price=1000.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(), total=200.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(),
        )
        o_cancelled = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="cancelled", created_at=_now(),
        )
        BudgetFactory.create(
            session=db_session, user_id=test_user.id, order_id=o_cancelled.id, final_price=500.00,
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["kpis"]["revenue_month"] == 1200.0

    def test_revenue_null_contributes_zero(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(),
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["kpis"]["revenue_month"] == 0.0


class TestActivity:
    def test_activity_exactly_14_entries_zero_filled(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_now(), total=10.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_days_ago(3), total=20.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_days_ago(13), total=30.00,
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        activity = response.json()["activity"]
        assert len(activity) == 14
        dates = [datetime.fromisoformat(point["date"]).date() for point in activity]
        assert dates == sorted(set(dates))
        assert dates[0] == _now().date() - timedelta(days=13)
        assert dates[-1] == _now().date()

        by_day = {datetime.fromisoformat(point["date"]).date(): point for point in activity}
        assert by_day[_days_ago(0).date()]["orders"] == 1
        assert by_day[_days_ago(3).date()]["orders"] == 1
        assert by_day[_days_ago(13).date()]["orders"] == 1
        assert by_day[_days_ago(0).date()]["revenue"] == 10.0
        assert by_day[_days_ago(3).date()]["revenue"] == 20.0
        assert by_day[_days_ago(13).date()]["revenue"] == 30.0
        assert by_day[_days_ago(1).date()]["orders"] == 0
        assert by_day[_days_ago(1).date()]["revenue"] == 0.0

    def test_activity_excludes_cancelled(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        o_active = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_days_ago(1),
        )
        BudgetFactory.create(
            session=db_session, user_id=test_user.id, order_id=o_active.id, final_price=300.00,
        )
        o_cancelled = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="cancelled", created_at=_now(),
        )
        BudgetFactory.create(
            session=db_session, user_id=test_user.id, order_id=o_cancelled.id, final_price=500.00,
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        activity = response.json()["activity"]
        by_day = {datetime.fromisoformat(point["date"]).date(): point for point in activity}

        assert by_day[_days_ago(1).date()]["orders"] == 1
        assert by_day[_days_ago(1).date()]["revenue"] == 300.0
        assert by_day[_now().date()]["orders"] == 0
        assert by_day[_now().date()]["revenue"] == 0.0


class TestRecentOrders:
    def test_recent_orders_within_months_persisted(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order_ids = []
        for i in range(7):
            order_ids.append(
                OrderFactory.create(
                    session=db_session, user_id=test_user.id, customer_id=customer.id,
                    status="new", created_at=_days_ago(i * 0.7), total=float(100 + i),
                ).id
            )
        cancelled_recent = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="cancelled", created_at=_days_ago(0.05),
        )
        cancelled_older = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="cancelled", created_at=_days_ago(0.1),
        )
        order_ids.append(cancelled_recent.id)
        order_ids.append(cancelled_older.id)

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        recent = response.json()["recent_orders"]

        assert len(recent) == 5
        assert all("cancelled" != item["status"] for item in recent)
        assert all(item["id"] != str(cancelled_recent.id) for item in recent)
        assert all(item["id"] != str(cancelled_older.id) for item in recent)

        created_ats = [item["created_at"] for item in recent]
        assert created_ats == sorted(created_ats, reverse=True)

        for item in recent:
            assert set(item.keys()) == {
                "id", "short_id", "customer_name", "work_type", "status",
                "final_value", "created_at",
            }
            assert len(item["short_id"]) == 8
            assert item["customer_name"] == customer.name

    def test_recent_orders_from_all_statuses_with_final_value(self, client, auth_headers, db_session, test_user):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        o_quoting = OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="quoting", created_at=_days_ago(1),
        )
        BudgetFactory.create(
            session=db_session, user_id=test_user.id, order_id=o_quoting.id, final_price=4321.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_days_ago(2), total=123.00,
        )
        OrderFactory.create(
            session=db_session, user_id=test_user.id, customer_id=customer.id,
            status="new", created_at=_days_ago(3),
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        recent = response.json()["recent_orders"]
        by_id = {item["id"]: item for item in recent}
        assert by_id[str(o_quoting.id)]["final_value"] == 4321.0


class TestLowStock:
    def test_low_stock_lists_and_empty(self, client, db_session, test_user):
        low_filament = FilamentFactory.create(
            session=db_session, user_id=test_user.id,
            color_name="Fil bajo", weight_grams=50.00, min_stock_warning_grams=200.00,
        )
        FilamentFactory.create(
            session=db_session, user_id=test_user.id,
            color_name="Fil sano", weight_grams=1000.00, min_stock_warning_grams=200.00,
        )
        low_supply = SupplyFactory.create(
            session=db_session, user_id=test_user.id,
            name="Insumo bajo", quantity=0.5, min_stock_warning=1.0,
        )
        SupplyFactory.create(
            session=db_session, user_id=test_user.id,
            name="Insumo sano", quantity=5.0, min_stock_warning=1.0,
        )

        token = _token_for(test_user)
        client.cookies.set("access_token", token)
        response = client.get("/api/dashboard/summary")
        assert response.status_code == 200
        data = response.json()

        assert len(data["low_stock"]["filaments"]) == 1
        assert data["low_stock"]["filaments"][0]["id"] == str(low_filament.id)
        assert data["low_stock"]["filaments"][0]["color_name"] == "Fil bajo"
        assert data["low_stock"]["supplies"] == [{
            "id": str(low_supply.id),
            "name": "Insumo bajo",
            "quantity": 0.5,
            "unit": low_supply.unit,
            "min_stock_warning": 1.0,
        }]

        never_low_user = UserFactory.create(session=db_session, name="Never Low")
        never_low_token = _token_for(never_low_user)
        client.cookies.set("access_token", never_low_token)
        empty = client.get("/api/dashboard/summary").json()
        assert empty["low_stock"]["filaments"] == []
        assert empty["low_stock"]["supplies"] == []


class TestPrinterBay:
    def test_printer_bay_active_only_with_maintenance(self, client, auth_headers, db_session, test_user):
        active_1 = PrinterFactory.create(
            session=db_session, user_id=test_user.id, name="Ender", brand="Creality", model="3 Pro",
        )
        active_2 = PrinterFactory.create(session=db_session, user_id=test_user.id, name="K1C")
        archived = PrinterFactory.create(
            session=db_session, user_id=test_user.id, name="Vieja", is_active=False,
        )
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id, printer_id=active_1.id,
            maintenance_date=_now().date(),
        )
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id, printer_id=active_1.id,
            maintenance_date=_now().date(),
        )
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id, printer_id=archived.id,
            maintenance_date=_now().date(),
        )
        PrinterMaintenanceFactory.create(
            session=db_session, user_id=test_user.id, printer_id=active_2.id,
            maintenance_date=_now().date(),
        )

        response = client.get("/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        printers = data["printers"]
        assert len(printers) == 2
        by_name = {p["name"]: p for p in printers}
        assert "Vieja" not in by_name
        assert by_name["Ender"]["maintenance_month"] == 2
        assert by_name["K1C"]["maintenance_month"] == 1
        assert set(printers[0].keys()) == {"id", "name", "brand", "model", "maintenance_month"}

        assert data["kpis"]["printers_active"] == 2
        assert data["kpis"]["maintenance_month"] == 3