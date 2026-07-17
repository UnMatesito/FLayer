import pytest


def test_create_filament_valid(client, auth_headers):
    response = client.post(
        "/api/filaments",
        json={
            "color_name": "PLA Silk Gold",
            "color_hex": "#FFD700",
            "filament_type": "PLA",
            "weight_grams": 1000.00,
            "price_per_kg": 25.00,
            "min_stock_warning_grams": 200.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["color_name"] == "PLA Silk Gold"
    assert data["color_hex"] == "#FFD700"
    assert data["brand"] == ""
    assert data["filament_type"] == "PLA"
    assert float(data["weight_grams"]) == 1000.00
    assert float(data["price_per_kg"]) == 25.00
    assert float(data["min_stock_warning_grams"]) == 200.00
    assert data["is_active"] is True
    assert "id" in data


def test_create_filament_duplicate_color_name_and_brand(client, auth_headers, test_filament):
    response = client.post(
        "/api/filaments",
        json={
            "color_name": test_filament.color_name,
            "color_hex": "#000000",
            "brand": test_filament.brand,
            "filament_type": "PLA",
            "weight_grams": 500.00,
            "price_per_kg": 30.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()

def test_create_filament_same_name_different_brand_allowed(client, auth_headers, db_session, test_user):
    from tests.factories.stock_factories import FilamentFactory

    existing = FilamentFactory.create(
        session=db_session, color_name="Red PLA", brand="SUNLU",
        user_id=test_user.id,
    )

    response = client.post(
        "/api/filaments",
        json={
            "color_name": existing.color_name,
            "color_hex": "#FF0000",
            "brand": "eSUN",
            "filament_type": "PLA",
            "weight_grams": 1000.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["color_name"] == "Red PLA"
    assert data["brand"] == "eSUN"


def test_list_filaments_active_only(client, auth_headers, db_session, test_user):
    from tests.factories.stock_factories import FilamentFactory

    FilamentFactory.create(
        session=db_session, color_name="Active A", is_active=True,
        user_id=test_user.id,
    )
    FilamentFactory.create(
        session=db_session, color_name="Active B", is_active=True,
        user_id=test_user.id,
    )
    FilamentFactory.create(
        session=db_session, color_name="Archived C", is_active=False,
        user_id=test_user.id,
    )

    response = client.get("/api/filaments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [f["color_name"] for f in data]
    assert "Active A" in names
    assert "Active B" in names
    assert "Archived C" not in names


def test_list_filaments_include_inactive(client, auth_headers, db_session, test_user):
    from tests.factories.stock_factories import FilamentFactory

    FilamentFactory.create(
        session=db_session, color_name="Active A", is_active=True,
        user_id=test_user.id,
    )
    FilamentFactory.create(
        session=db_session, color_name="Archived B", is_active=False,
        user_id=test_user.id,
    )

    response = client.get("/api/filaments?include_inactive=true", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [f["color_name"] for f in data]
    assert "Active A" in names
    assert "Archived B" in names


def test_filament_weight_adjust_positive(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}/adjust",
        json={"delta_grams": 500.00, "notes": "Spool replacement"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["weight_grams"]) == 1500.00
    assert "movement_id" in data


def test_filament_weight_adjust_negative(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}/adjust",
        json={"delta_grams": -50.00, "notes": "Calibration adjustment"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["weight_grams"]) == 950.00
    assert "movement_id" in data


def test_filament_weight_adjust_creates_movement(client, auth_headers, test_filament):
    client.patch(
        f"/api/filaments/{test_filament.id}/adjust",
        json={"delta_grams": 200.00},
        headers=auth_headers,
    )

    response = client.get(
        f"/api/stock-movements?filament_id={test_filament.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    types = [m["movement_type"] for m in data["items"]]
    assert "adjustment" in types


def test_create_supply_valid(client, auth_headers):
    response = client.post(
        "/api/supplies",
        json={
            "name": "Isopropyl Alcohol",
            "quantity": 5.0,
            "unit": "liters",
            "min_stock_warning": 1.0,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Isopropyl Alcohol"
    assert float(data["quantity"]) == 5.0
    assert data["unit"] == "liters"
    assert "id" in data


def test_update_supply_quantity(client, auth_headers, test_supply):
    response = client.patch(
        f"/api/supplies/{test_supply.id}",
        json={"quantity": 10.0},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["quantity"]) == 10.0


def test_stock_deduction_on_ready(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="in_progress",
        filament_id=test_filament.id,
        grams_estimated=200.00,
    )

    response = client.patch(
        f"/api/orders/{order.id}/status",
        json={
            "status": "ready",
            "filament_id": str(test_filament.id),
            "grams": 200.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    movement_response = client.get(
        f"/api/stock-movements?filament_id={test_filament.id}",
        headers=auth_headers,
    )
    assert movement_response.status_code == 200
    data = movement_response.json()
    consumption_movements = [
        m for m in data["items"] if m["movement_type"] == "consumption"
    ]
    assert len(consumption_movements) >= 1
    assert float(consumption_movements[0]["quantity_grams"]) == -200.00


def test_stock_deduction_oversell_allowed(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="in_progress",
    )

    response = client.patch(
        f"/api/orders/{order.id}/status",
        json={
            "status": "ready",
            "filament_id": str(test_filament.id),
            "grams": 99999.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    get_response = client.get(
        f"/api/filaments/{test_filament.id}",
        headers=auth_headers,
    )
    assert float(get_response.json()["weight_grams"]) < 0


def test_stock_reversal_on_ready_to_cancelled(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="in_progress",
    )

    original_weight = float(test_filament.weight_grams)

    client.patch(
        f"/api/orders/{order.id}/status",
        json={
            "status": "ready",
            "filament_id": str(test_filament.id),
            "grams": 200.00,
        },
        headers=auth_headers,
    )

    after_deduction = client.get(
        f"/api/filaments/{test_filament.id}",
        headers=auth_headers,
    ).json()
    assert float(after_deduction["weight_grams"]) == original_weight - 200.00

    client.patch(
        f"/api/orders/{order.id}/status",
        json={"status": "cancelled"},
        headers=auth_headers,
    )

    get_response = client.get(
        f"/api/filaments/{test_filament.id}",
        headers=auth_headers,
    )
    assert float(get_response.json()["weight_grams"]) == original_weight


def test_no_reversal_on_new_to_cancelled(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="new",
    )

    response = client.patch(
        f"/api/orders/{order.id}/status",
        json={"status": "cancelled"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    movement_response = client.get(
        "/api/stock-movements",
        headers=auth_headers,
    )
    data = movement_response.json()
    reversal_movements = [
        m for m in data["items"] if m["movement_type"] == "reversal"
    ]
    order_movements = [
        m for m in reversal_movements if m["order_id"] == str(order.id)
    ]
    assert len(order_movements) == 0


def test_stock_movements_paginated(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.stock_factories import StockMovementFactory

    for i in range(5):
        StockMovementFactory.create(
            session=db_session,
            filament_id=test_filament.id,
            user_id=test_user.id,
            created_by_user_id=test_user.id,
        )

    response = client.get(
        "/api/stock-movements?per_page=2&page=1",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 2
    assert data["total"] >= 5
    assert data["page"] == 1
    assert data["per_page"] == 2


def test_stock_movements_filter_by_type(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.stock_factories import StockMovementFactory

    StockMovementFactory.create(
        session=db_session,
        filament_id=test_filament.id,
        movement_type="consumption",
        quantity_grams=-100.00,
        user_id=test_user.id,
        created_by_user_id=test_user.id,
    )
    StockMovementFactory.create(
        session=db_session,
        filament_id=test_filament.id,
        movement_type="adjustment",
        quantity_grams=50.00,
        user_id=test_user.id,
        created_by_user_id=test_user.id,
    )

    response = client.get(
        "/api/stock-movements?movement_type=consumption",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["movement_type"] == "consumption"


def test_stock_movements_filter_by_filament(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.stock_factories import FilamentFactory, StockMovementFactory

    other = FilamentFactory.create(
        session=db_session, user_id=test_user.id,
    )
    StockMovementFactory.create(
        session=db_session,
        filament_id=test_filament.id,
        user_id=test_user.id,
        created_by_user_id=test_user.id,
    )
    StockMovementFactory.create(
        session=db_session,
        filament_id=other.id,
        user_id=test_user.id,
        created_by_user_id=test_user.id,
    )

    response = client.get(
        f"/api/stock-movements?filament_id={test_filament.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["filament_id"] == str(test_filament.id)


def test_low_stock_filament_detected(client, auth_headers, test_low_stock_filament):
    response = client.get("/api/stock/low-stock", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    filament_ids = [f["id"] for f in data["filaments"]]
    assert str(test_low_stock_filament.id) in filament_ids


def test_low_stock_supply_detected(client, auth_headers, test_low_stock_supply):
    response = client.get("/api/stock/low-stock", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    supply_ids = [s["id"] for s in data["supplies"]]
    assert str(test_low_stock_supply.id) in supply_ids


def test_invalid_movement_type_rejected(client, auth_headers):
    response = client.get(
        "/api/stock-movements?movement_type=invalid_type",
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_archive_filament_hides_from_list(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}",
        json={"is_active": False},
        headers=auth_headers,
    )
    assert response.status_code == 200

    list_response = client.get("/api/filaments", headers=auth_headers)
    data = list_response.json()
    ids = [f["id"] for f in data]
    assert str(test_filament.id) not in ids


def test_archive_filament_preserves_movements(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.stock_factories import StockMovementFactory

    StockMovementFactory.create(
        session=db_session,
        filament_id=test_filament.id,
        user_id=test_user.id,
        created_by_user_id=test_user.id,
    )

    client.patch(
        f"/api/filaments/{test_filament.id}",
        json={"is_active": False},
        headers=auth_headers,
    )

    movement_response = client.get(
        f"/api/stock-movements?filament_id={test_filament.id}",
        headers=auth_headers,
    )
    assert movement_response.status_code == 200
    data = movement_response.json()
    assert data["total"] >= 1


def test_ready_transition_without_filament_id(client, auth_headers, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="in_progress",
    )

    response = client.patch(
        f"/api/orders/{order.id}/status",
        json={"status": "ready"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_status_change_request_body_extended_fields(client, auth_headers, test_filament, test_user, db_session):
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.order_factory import OrderFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)
    order = OrderFactory.create(
        session=db_session,
        user_id=test_user.id,
        customer_id=customer.id,
        status="in_progress",
    )

    response = client.patch(
        f"/api/orders/{order.id}/status",
        json={
            "status": "ready",
            "filament_id": str(test_filament.id),
            "grams": 150.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200

    detail_response = client.get(
        f"/api/orders/{order.id}",
        headers=auth_headers,
    )
    assert detail_response.status_code == 200


def test_get_filament_detail(client, auth_headers, test_filament):
    response = client.get(
        f"/api/filaments/{test_filament.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_filament.id)
    assert data["color_name"] == test_filament.color_name


def test_create_filament_with_brand(client, auth_headers):
    response = client.post(
        "/api/filaments",
        json={
            "color_name": "PLA Silk Gold",
            "color_hex": "#FFD700",
            "brand": "SUNLU",
            "filament_type": "PLA",
            "weight_grams": 1000.00,
            "price_per_kg": 25.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["brand"] == "SUNLU"


def test_create_filament_with_settings(client, auth_headers):
    response = client.post(
        "/api/filaments",
        json={
            "color_name": "eSUN PLA+",
            "color_hex": "#00AA00",
            "filament_type": "PLA",
            "weight_grams": 1000.00,
            "price_per_kg": 22.00,
            "settings": {
                "recommended_nozzle_temp_min": 190,
                "recommended_nozzle_temp_max": 230,
                "flow_ratio": 0.98,
                "nozzle_temperature": 210,
                "max_volumetric_speed": 15.0,
                "pressure_advance": 0.04,
                "nominal_diameter": 1.75,
                "plate_temperature": 60,
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["settings"]["recommended_nozzle_temp_min"] == 190
    assert data["settings"]["recommended_nozzle_temp_max"] == 230
    assert data["settings"]["flow_ratio"] == 0.98
    assert data["settings"]["nozzle_temperature"] == 210
    assert data["settings"]["max_volumetric_speed"] == 15.0
    assert data["settings"]["pressure_advance"] == 0.04
    assert data["settings"]["nominal_diameter"] == 1.75
    assert data["settings"]["plate_temperature"] == 60


def test_update_filament_brand(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}",
        json={"brand": "Prusament"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "Prusament"


def test_update_filament_settings(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}",
        json={"settings": {"flow_ratio": 0.95, "pressure_advance": 0.02}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["settings"]["flow_ratio"] == 0.95
    assert data["settings"]["pressure_advance"] == 0.02


def test_update_filament_metadata(client, auth_headers, test_filament):
    response = client.patch(
        f"/api/filaments/{test_filament.id}",
        json={
            "price_per_kg": 30.00,
            "min_stock_warning_grams": 500.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["price_per_kg"]) == 30.00
    assert float(data["min_stock_warning_grams"]) == 500.00


def test_get_supply_detail(client, auth_headers, test_supply):
    response = client.get(
        f"/api/supplies/{test_supply.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_supply.id)
    assert data["name"] == test_supply.name
