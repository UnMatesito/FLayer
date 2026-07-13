from sqlalchemy import select

from backend.models.customer import Customer
from backend.models.order import Order
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.schema_factories import OrderCreateFactory, PublicOrderCreateFactory


class TestCreateOrderPublic:
    def test_create_order_impresion3d_valid(self, client, db_session):
        body = PublicOrderCreateFactory.build(work_type="impresion_3d")
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 201
        data = resp.json()
        assert data["work_type"] == "impresion_3d"
        assert data["status"] == "new"
        assert data["client_notified"] is True

        result = db_session.execute(select(Customer).where(Customer.email == body.customer.email))
        customer = result.scalar_one_or_none()
        assert customer is not None

        result = db_session.execute(select(Order).where(Order.id == data["id"]))
        order = result.scalar_one_or_none()
        assert order is not None

    def test_create_order_diseno3d_valid(self, client, db_session):
        body = PublicOrderCreateFactory.build(work_type="diseno_3d")
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 201
        data = resp.json()
        assert data["work_type"] == "diseno_3d"
        assert data["status"] == "new"

    def test_create_order_invalid_email(self, client):
        body = PublicOrderCreateFactory.build()
        payload = body.model_dump(mode="json")
        payload["customer"]["email"] = "not-an-email"
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_empty_name(self, client):
        body = PublicOrderCreateFactory.build()
        payload = body.model_dump(mode="json")
        payload["customer"]["name"] = "   "
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_file_too_large(self, client):
        body = PublicOrderCreateFactory.build()
        payload = body.model_dump(mode="json")
        payload["files"] = [
            {"filename": f"part{i}.stl", "url": f"https://drive.google.com/part{i}.stl"}
            for i in range(11)
        ]
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_customer_reused_by_email(self, client, db_session):
        body = PublicOrderCreateFactory.build()
        payload = body.model_dump(mode="json")
        resp1 = client.post("/api/public/orders", json=payload)
        assert resp1.status_code == 201

        result = db_session.execute(select(Customer).where(Customer.email == body.customer.email))
        customers = list(result.scalars().all())
        assert len(customers) == 1

        payload["description"] = "Second order"
        resp2 = client.post("/api/public/orders", json=payload)
        assert resp2.status_code == 201

        result = db_session.execute(select(Customer).where(Customer.email == body.customer.email))
        customers = list(result.scalars().all())
        assert len(customers) == 1


class TestCreateOrderInternal:
    def test_create_order_manual_skip_email(
        self, client, db_session, auth_headers
    ) -> None:
        body = OrderCreateFactory.build(skip_client_notification=True)
        resp = client.post(
            "/api/orders",
            json=body.model_dump(mode="json"),
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["client_notified"] is False


class TestListOrders:
    def test_active_orders_sorted_desc(
        self,
        client,
        db_session,
        auth_headers,
        test_user,
    ) -> None:
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            work_type="impresion_3d",
            description="First order",
            status="new",
        )
        OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            work_type="diseno_3d",
            description="Second order",
            status="new",
        )

        resp = client.get(
            "/api/orders?status=active",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        dates = [d["created_at"] for d in data]
        assert dates == sorted(dates, reverse=True)
