import pytest
from sqlalchemy import func, select

from backend.models.customer import Customer
from backend.models.order import Order
from tests.factories.customer_factory import CustomerFactory
from tests.factories.order_factory import OrderFactory
from tests.factories.schema_factories import OrderCreateFactory, PublicOrderCreateFactory
from tests.factories.store_token_factory import StoreTokenFactory


@pytest.fixture
def store_token_user(db_session, test_user):
    return StoreTokenFactory.create(session=db_session, user_id=test_user.id)


@pytest.fixture
def store_token(store_token_user):
    return store_token_user.token


class TestCreateOrderPublic:
    def test_create_order_impresion3d_valid(self, client, db_session, store_token):
        body = PublicOrderCreateFactory.build(
            work_type="impresion_3d", token=store_token
        )
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

    def test_create_order_diseno3d_valid(self, client, db_session, store_token):
        body = PublicOrderCreateFactory.build(
            work_type="diseno_3d", token=store_token
        )
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 201
        data = resp.json()
        assert data["work_type"] == "diseno_3d"
        assert data["status"] == "new"

    def test_create_order_invalid_email(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload["customer"]["email"] = "not-an-email"
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_empty_name(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload["customer"]["name"] = "   "
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_file_too_large(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload["files"] = [
            {"filename": f"part{i}.stl", "url": f"https://drive.google.com/part{i}.stl"}
            for i in range(11)
        ]
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_customer_reused_by_email(self, client, db_session, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
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


class TestPublicOrderTokenRequired:
    def test_missing_token_returns_404(self, client):
        body = PublicOrderCreateFactory.build(token=None)
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Invalid store token"

    def test_unknown_token_returns_404(self, client):
        body = PublicOrderCreateFactory.build(token="nonexistent_token_abc123")
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Invalid store token"


class TestPublicProductsTokenRequired:
    def test_missing_token_returns_404(self, client):
        resp = client.get("/api/public/products")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Invalid store token"

    def test_unknown_token_returns_404(self, client):
        resp = client.get("/api/public/products?token=nonexistent_token_abc123")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Invalid store token"


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


class TestCreateOrderCategoryRevision:
    def test_create_order_print_persists_new_fields(
        self, client, db_session, store_token
    ):
        body = PublicOrderCreateFactory.build(
            order_category="print",
            work_type="impresion_3d",
            needs_3d_printing=True,
            needs_3d_modelling=True,
            dimensions="100 x 50 x 30 mm",
            type_of_delivery="Delivery",
            token=store_token,
        )
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 201
        data = resp.json()
        assert data["order_category"] == "print"
        assert data["needs_3d_printing"] is True
        assert data["needs_3d_modelling"] is True
        assert data["dimensions"] == "100 x 50 x 30 mm"
        assert data["type_of_delivery"] == "Delivery"

        result = db_session.execute(select(Order).where(Order.id == data["id"]))
        order = result.scalar_one()
        assert order.order_category == "print"
        assert order.needs_3d_printing is True
        assert order.needs_3d_modelling is True
        assert order.dimensions == "100 x 50 x 30 mm"
        assert order.type_of_delivery == "Delivery"

    def test_create_order_product_forces_services_false(
        self, client, db_session, store_token
    ):
        body = PublicOrderCreateFactory.build(
            order_category="product",
            work_type="product",
            needs_3d_printing=True,
            needs_3d_modelling=True,
            type_of_delivery="Delivery",
            token=store_token,
        )
        resp = client.post("/api/public/orders", json=body.model_dump(mode="json"))
        assert resp.status_code == 201
        data = resp.json()
        assert data["order_category"] == "product"
        assert data["needs_3d_printing"] is False
        assert data["needs_3d_modelling"] is False

        result = db_session.execute(select(Order).where(Order.id == data["id"]))
        order = result.scalar_one()
        assert order.order_category == "product"
        assert order.needs_3d_printing is False
        assert order.needs_3d_modelling is False

    def test_create_order_invalid_category_rejected(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload["order_category"] = "industrial"
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_missing_category_rejected(self, client, db_session, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload.pop("order_category")
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

        result = db_session.execute(select(func.count()).select_from(Order))
        assert result.scalar_one() == 0

    def test_create_order_print_without_service_rejected(self, client, store_token):
        body = PublicOrderCreateFactory.build(
            order_category="print",
            needs_3d_printing=True,
            needs_3d_modelling=False,
            token=store_token,
        )
        payload = body.model_dump(mode="json")
        payload["needs_3d_printing"] = False
        payload["needs_3d_modelling"] = False
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_missing_delivery_type_rejected(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload.pop("type_of_delivery")
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422

    def test_create_order_invalid_delivery_type_rejected(self, client, store_token):
        body = PublicOrderCreateFactory.build(token=store_token)
        payload = body.model_dump(mode="json")
        payload["type_of_delivery"] = "Courier express"
        resp = client.post("/api/public/orders", json=payload)
        assert resp.status_code == 422


class TestCreateOrderInternalRevision:
    def test_create_internal_order_persists_revision_fields(
        self, client, db_session, auth_headers
    ):
        body = OrderCreateFactory.build(
            order_category="product",
            work_type="product",
            type_of_delivery="Presencial acordado",
        )
        resp = client.post(
            "/api/orders",
            json=body.model_dump(mode="json"),
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["order_category"] == "product"
        assert data["type_of_delivery"] == "Presencial acordado"
        assert data["needs_3d_printing"] is False
        assert data["needs_3d_modelling"] is False


class TestDeliveryCost:
    def test_delivery_cost_saves_for_delivery_order(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Delivery",
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": 350.0, "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["delivery_embalaje"] == 350.0
        assert data["delivery_precio_envio"] == 1200.0
        assert data["type_of_delivery"] == "Delivery"

        result = db_session.execute(select(Order).where(Order.id == order.id))
        updated = result.scalar_one()
        assert float(updated.delivery_embalaje) == 350.0
        assert float(updated.delivery_precio_envio) == 1200.0

    def test_delivery_cost_replaces_existing_values(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Delivery",
            delivery_embalaje=100.0,
            delivery_precio_envio=800.0,
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": 350.0, "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["delivery_embalaje"] == 350.0
        assert data["delivery_precio_envio"] == 1200.0

    def test_delivery_cost_rejected_for_pickup_order(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Presencial acordado",
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": 350.0, "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 409

        result = db_session.execute(select(Order).where(Order.id == order.id))
        updated = result.scalar_one()
        assert updated.delivery_embalaje is None
        assert updated.delivery_precio_envio is None

    def test_delivery_cost_non_numeric_rejected(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Delivery",
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": "abc", "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 422

        result = db_session.execute(select(Order).where(Order.id == order.id))
        updated = result.scalar_one()
        assert updated.delivery_embalaje is None

    def test_delivery_cost_negative_rejected(
        self, client, db_session, auth_headers, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Delivery",
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": -5.0, "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_delivery_cost_not_found(self, client, db_session, auth_headers, test_user):
        resp = client.patch(
            "/api/orders/00000000-0000-0000-0000-000000000000/delivery-cost",
            json={"embalaje": 350.0, "precio_envio": 1200.0},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_delivery_cost_requires_auth(
        self, client, db_session, test_user
    ):
        customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
        order = OrderFactory.create(
            session=db_session,
            user_id=test_user.id,
            customer_id=customer.id,
            type_of_delivery="Delivery",
        )
        resp = client.patch(
            f"/api/orders/{order.id}/delivery-cost",
            json={"embalaje": 350.0, "precio_envio": 1200.0},
        )
        assert resp.status_code == 401
