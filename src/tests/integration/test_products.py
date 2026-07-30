import io

import pytest


def test_create_product_valid(client, auth_headers):
    response = client.post(
        "/api/products",
        json={
            "name": "PLA Keychain - Spaceship",
            "description": "15x15mm, single color",
            "price": 5.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "PLA Keychain - Spaceship"
    assert data["description"] == "15x15mm, single color"
    assert float(data["price"]) == 5.00
    assert data["is_active"] is True
    assert data["image_url"] is None
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_list_active_products_excludes_inactive(client, auth_headers, db_session, test_user):
    from tests.factories.product_factory import FixedProductFactory

    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Alpha")
    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Beta", is_active=False)
    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Gamma")

    response = client.get("/api/products", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [p["name"] for p in data]
    assert "Alpha" in names
    assert "Gamma" in names
    assert "Beta" not in names


def test_list_products_sorted_by_name(client, auth_headers, db_session, test_user):
    from tests.factories.product_factory import FixedProductFactory

    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Zeta")
    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Alpha")

    response = client.get("/api/products", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["name"] == "Alpha"
    assert data[1]["name"] == "Zeta"


def test_list_products_show_inactive(client, auth_headers, db_session, test_user):
    from tests.factories.product_factory import FixedProductFactory

    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Active", is_active=True)
    FixedProductFactory.create(session=db_session, user_id=test_user.id, name="Inactive", is_active=False)

    response = client.get("/api/products?show_inactive=true", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [p["name"] for p in data]
    assert "Active" in names
    assert "Inactive" in names


def test_update_product_fields(client, auth_headers, test_product):
    response = client.patch(
        f"/api/products/{test_product.id}",
        json={"name": "Updated Name", "price": 15.00},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert float(data["price"]) == 15.00


def test_create_product_negative_price_rejected(client, auth_headers):
    response = client.post(
        "/api/products",
        json={"name": "Test", "price": -5.00},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_update_product_negative_price_rejected(client, auth_headers, test_product):
    response = client.patch(
        f"/api/products/{test_product.id}",
        json={"price": -5.00},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_update_product_empty_name_rejected(client, auth_headers, test_product):
    response = client.patch(
        f"/api/products/{test_product.id}",
        json={"name": ""},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.patch(
        f"/api/products/{test_product.id}",
        json={"name": "   "},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_soft_delete_product(client, auth_headers, test_product):
    response = client.delete(
        f"/api/products/{test_product.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False

    get_response = client.get(f"/api/products/{test_product.id}", headers=auth_headers)
    assert get_response.json()["is_active"] is False

    list_response = client.get("/api/products", headers=auth_headers)
    ids = [p["id"] for p in list_response.json()]
    assert str(test_product.id) not in ids


def test_create_product_empty_name_rejected(client, auth_headers):
    response = client.post(
        "/api/products",
        json={"name": "", "price": 5.00},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/products",
        json={"name": "   ", "price": 5.00},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_get_product_by_id_includes_inactive(client, auth_headers, test_inactive_product):
    response = client.get(
        f"/api/products/{test_inactive_product.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_inactive_product.id)
    assert data["is_active"] is False


def test_get_product_by_id_not_found(client, auth_headers):
    response = client.get(
        "/api/products/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_order_with_fixed_product_id_sets_total(client, auth_headers, test_product, db_session, test_user):
    from tests.factories.customer_factory import CustomerFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)

    response = client.post(
        "/api/orders",
        json={
            "customer": {
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
            },
            "work_type": "product",
            "description": "Order for fixed product",
            "fixed_product_id": str(test_product.id),
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["fixed_product_id"] == str(test_product.id)
    assert float(data["total"]) == float(test_product.price)


def test_order_references_nonexistent_product_rejected(client, auth_headers, db_session, test_user):
    from tests.factories.customer_factory import CustomerFactory

    customer = CustomerFactory.create(session=db_session, user_id=test_user.id)

    response = client.post(
        "/api/orders",
        json={
            "customer": {
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
            },
            "work_type": "product",
            "description": "Order for nonexistent product",
            "fixed_product_id": "00000000-0000-0000-0000-000000000000",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_upload_product_image_valid(client, auth_headers, test_product):
    response = client.post(
        f"/api/products/{test_product.id}/image",
        files={"file": ("test.png", io.BytesIO(b"fake-png-content"), "image/png")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["image_url"] is not None
    assert data["id"] == str(test_product.id)


def test_upload_product_image_invalid_type(client, auth_headers, test_product):
    response = client.post(
        f"/api/products/{test_product.id}/image",
        files={"file": ("test.pdf", io.BytesIO(b"fake-pdf-content"), "application/pdf")},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_upload_product_image_too_large(client, auth_headers, test_product):
    large_content = b"x" * (11 * 1024 * 1024)
    response = client.post(
        f"/api/products/{test_product.id}/image",
        files={"file": ("test.png", io.BytesIO(large_content), "image/png")},
        headers=auth_headers,
    )
    assert response.status_code == 422
