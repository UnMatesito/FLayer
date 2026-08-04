import time

from tests.factories.printer_factory import PrinterFactory, PrinterMaintenanceFactory


def test_create_printer_valid(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={
            "name": "Ender 3 Pro",
            "brand": "Creality",
            "model": "Ender 3 Pro",
            "nozzle_sizes": ["0.2", "0.4"],
            "power_watts": 120.00,
            "lifespan_hours": 4320.00,
            "spare_parts_cost": 400.00,
            "image_url": "https://example.com/printer.png",
            "notes": "Main printer, PLA only",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Ender 3 Pro"
    assert data["brand"] == "Creality"
    assert data["model"] == "Ender 3 Pro"
    assert data["nozzle_sizes"] == ["0.2", "0.4"]
    assert float(data["power_watts"]) == 120.00
    assert float(data["lifespan_hours"]) == 4320.00
    assert float(data["spare_parts_cost"]) == 400.00
    assert data["image_url"] == "https://example.com/printer.png"
    assert data["notes"] == "Main printer, PLA only"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_printer_optional_fields_null(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Solo nombre"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Solo nombre"
    assert data["brand"] is None
    assert data["model"] is None
    assert data["nozzle_sizes"] == []
    assert data["power_watts"] is None
    assert data["lifespan_hours"] is None
    assert data["spare_parts_cost"] is None
    assert data["image_url"] is None
    assert data["notes"] is None


def test_list_printers_active_only(client, auth_headers, db_session, test_user):
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Alpha")
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Beta", is_active=False)
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Gamma")

    response = client.get("/api/printers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [p["name"] for p in data]
    assert "Alpha" in names
    assert "Gamma" in names
    assert "Beta" not in names


def test_list_printers_sorted_by_name(client, auth_headers, db_session, test_user):
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Zeta")
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Alpha")
    PrinterFactory.create(session=db_session, user_id=test_user.id, name="Beta")

    response = client.get("/api/printers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    names = [p["name"] for p in data]
    assert names == ["Alpha", "Beta", "Zeta"]


def test_get_printer_by_id_includes_inactive(client, auth_headers, test_inactive_printer):
    response = client.get(
        f"/api/printers/{test_inactive_printer.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_inactive_printer.id)
    assert data["is_active"] is False


def test_get_printer_by_id_not_found(client, auth_headers):
    response = client.get(
        "/api/printers/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_update_printer_fields(client, auth_headers, test_printer):
    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={
            "name": "Ender 3 V3 SE",
            "brand": "Creality",
            "model": "Ender 3 V3 SE",
            "nozzle_sizes": ["0.2", "0.6", "0.8"],
            "power_watts": 80.00,
            "lifespan_hours": 2000.00,
            "spare_parts_cost": 250.00,
            "notes": "Moved to the lab",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Ender 3 V3 SE"
    assert data["brand"] == "Creality"
    assert data["model"] == "Ender 3 V3 SE"
    assert data["nozzle_sizes"] == ["0.2", "0.6", "0.8"]
    assert float(data["power_watts"]) == 80.00
    assert float(data["lifespan_hours"]) == 2000.00
    assert float(data["spare_parts_cost"]) == 250.00
    assert data["notes"] == "Moved to the lab"


def test_update_printer_refreshes_updated_at(client, auth_headers, test_printer):
    time.sleep(0.01)
    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"notes": "touched"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated_at"] != data["created_at"]


def test_nozzle_sizes_presets_and_custom_accepted(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Nozzle Mix", "nozzle_sizes": ["0.2", "0.4", "0.6", "0.8", "1.0"]},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["nozzle_sizes"] == ["0.2", "0.4", "0.6", "0.8", "1.0"]


def test_nozzle_sizes_empty_allowed(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "No Nozzles", "nozzle_sizes": []},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["nozzle_sizes"] == []


def test_duplicate_nozzle_sizes_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Dupe", "nozzle_sizes": ["0.4", "0.4"]},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_invalid_nozzle_size_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Bad Nozzle", "nozzle_sizes": ["abc"]},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/printers",
        json={"name": "Bad Nozzle", "nozzle_sizes": ["-0.4"]},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_non_finite_nozzle_size_422(client, auth_headers):
    for bad in ["NaN", "Infinity", "-Infinity"]:
        response = client.post(
            "/api/printers",
            json={"name": "Non Finite", "nozzle_sizes": [bad]},
            headers=auth_headers,
        )
        assert response.status_code == 422, f"{bad} should be rejected with 422"


def test_brand_model_too_long_422(client, auth_headers):
    long = "x" * 101
    response = client.post(
        "/api/printers",
        json={"name": "Long Brand", "brand": long},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/printers",
        json={"name": "Long Model", "model": long},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/printers",
        json={"name": "Long Both", "brand": long, "model": long},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_brand_model_exactly_100_chars_accepted(client, auth_headers):
    long = "x" * 100
    response = client.post(
        "/api/printers",
        json={"name": "At Limit", "brand": long, "model": long},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["brand"] == long
    assert response.json()["model"] == long


def test_update_brand_model_too_long_422(client, auth_headers, test_printer):
    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"brand": "x" * 101},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_negative_power_watts_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Neg Power", "power_watts": -10},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_negative_lifespan_hours_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Neg Life", "lifespan_hours": -100},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_negative_spare_parts_cost_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Neg Cost", "spare_parts_cost": -50},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_printer_with_image_url(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "With Image", "image_url": "https://example.com/img/printer.png"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["image_url"] == "https://example.com/img/printer.png"


def test_update_printer_image_url(client, auth_headers, test_printer):
    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"image_url": "https://example.com/new.png"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["image_url"] == "https://example.com/new.png"

    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"image_url": None},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["image_url"] is None


def test_printer_image_url_invalid_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Bad URL", "image_url": "ftp://example.com/img.png"},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/printers",
        json={"name": "Bad URL", "image_url": "https://example.com/" + "x" * 500},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_get_printer_catalog(client, auth_headers):
    response = client.get("/api/printers/catalog", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    brands = [b["brand"] for b in data["brands"]]
    for expected in ["Bambu Lab", "Creality", "Prusa", "Anycubic", "Elegoo"]:
        assert expected in brands
    creality = next(b for b in data["brands"] if b["brand"] == "Creality")
    assert "Ender 3 Pro" in creality["models"]


def test_get_printer_catalog_requires_auth(client):
    response = client.get("/api/printers/catalog")
    assert response.status_code == 401


def test_create_printer_custom_brand_model_accepted(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": "Custom", "brand": "ObscureBrand", "model": "CustomModel X9"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["brand"] == "ObscureBrand"
    assert data["model"] == "CustomModel X9"


def test_soft_delete_printer(client, auth_headers, test_printer):
    response = client.delete(
        f"/api/printers/{test_printer.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_printer.id)
    assert data["is_active"] is False

    get_response = client.get(f"/api/printers/{test_printer.id}", headers=auth_headers)
    assert get_response.json()["is_active"] is False


def test_soft_deleted_printer_hidden_from_list(client, auth_headers, test_printer):
    client.delete(f"/api/printers/{test_printer.id}", headers=auth_headers)

    response = client.get("/api/printers", headers=auth_headers)
    assert response.status_code == 200
    ids = [p["id"] for p in response.json()]
    assert str(test_printer.id) not in ids


def test_soft_delete_preserves_maintenance(client, auth_headers, test_printer, db_session):
    PrinterMaintenanceFactory.create(
        session=db_session,
        user_id=test_printer.user_id,
        printer_id=test_printer.id,
    )

    client.delete(f"/api/printers/{test_printer.id}", headers=auth_headers)

    response = client.get(f"/api/printers/{test_printer.id}/maintenance", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_list_printers_only_own(client, auth_headers, db_session, other_user):
    PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign Printer")
    PrinterFactory.create(session=db_session, user_id=other_user.id, name="Another Foreign")

    response = client.get("/api/printers", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_get_foreign_printer_404(client, auth_headers, db_session, other_user):
    foreign = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")

    response = client.get(f"/api/printers/{foreign.id}", headers=auth_headers)
    assert response.status_code == 404


def test_update_foreign_printer_404(client, auth_headers, db_session, other_user):
    foreign = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")

    response = client.patch(
        f"/api/printers/{foreign.id}",
        json={"name": "Hijacked"},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_delete_foreign_printer_404(client, auth_headers, db_session, other_user):
    foreign = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")

    response = client.delete(f"/api/printers/{foreign.id}", headers=auth_headers)
    assert response.status_code == 404


def test_duplicate_printer_name_409(client, auth_headers, test_printer):
    response = client.post(
        "/api/printers",
        json={"name": test_printer.name},
        headers=auth_headers,
    )
    assert response.status_code == 409


def test_duplicate_name_case_insensitive_409(client, auth_headers, test_printer):
    response = client.post(
        "/api/printers",
        json={"name": test_printer.name.upper()},
        headers=auth_headers,
    )
    assert response.status_code == 409


def test_duplicate_name_after_archive_allowed(client, auth_headers, test_printer):
    client.delete(f"/api/printers/{test_printer.id}", headers=auth_headers)

    response = client.post(
        "/api/printers",
        json={"name": test_printer.name},
        headers=auth_headers,
    )
    assert response.status_code == 201


def test_create_printer_empty_name_422(client, auth_headers):
    response = client.post(
        "/api/printers",
        json={"name": ""},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.post(
        "/api/printers",
        json={"name": "   "},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_update_printer_empty_name_422(client, auth_headers, test_printer):
    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"name": ""},
        headers=auth_headers,
    )
    assert response.status_code == 422

    response = client.patch(
        f"/api/printers/{test_printer.id}",
        json={"name": "   "},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_create_maintenance_valid(client, auth_headers, test_printer):
    response = client.post(
        f"/api/printers/{test_printer.id}/maintenance",
        json={
            "maintenance_type": "calibration",
            "maintenance_date": "2026-07-31",
            "description": "Z-offset recalibration after bed swap",
            "cost": 0.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["printer_id"] == str(test_printer.id)
    assert data["maintenance_type"] == "calibration"
    assert data["maintenance_date"] == "2026-07-31"
    assert data["description"] == "Z-offset recalibration after bed swap"
    assert float(data["cost"]) == 0.00
    assert "id" in data
    assert "created_at" in data


def test_maintenance_requires_existing_printer_404(client, auth_headers):
    response = client.post(
        "/api/printers/00000000-0000-0000-0000-000000000000/maintenance",
        json={
            "maintenance_type": "cleaning",
            "maintenance_date": "2026-07-31",
            "description": "Deep clean",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_create_maintenance_foreign_printer_404(client, auth_headers, db_session, other_user):
    foreign = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")

    response = client.post(
        f"/api/printers/{foreign.id}/maintenance",
        json={
            "maintenance_type": "repair",
            "maintenance_date": "2026-07-31",
            "description": "Hotend swap",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_invalid_maintenance_type_422(client, auth_headers, test_printer):
    response = client.post(
        f"/api/printers/{test_printer.id}/maintenance",
        json={
            "maintenance_type": "upgrade",
            "maintenance_date": "2026-07-31",
            "description": "Not a valid type",
        },
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_negative_maintenance_cost_422(client, auth_headers, test_printer):
    response = client.post(
        f"/api/printers/{test_printer.id}/maintenance",
        json={
            "maintenance_type": "repair",
            "maintenance_date": "2026-07-31",
            "description": "Hotend swap",
            "cost": -5.00,
        },
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_maintenance_without_cost_allowed(client, auth_headers, test_printer):
    response = client.post(
        f"/api/printers/{test_printer.id}/maintenance",
        json={
            "maintenance_type": "cleaning",
            "maintenance_date": "2026-07-31",
            "description": "Routine cleaning",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["cost"] is None


def test_list_maintenance_ordered_by_date_desc(client, auth_headers, test_printer, db_session):
    PrinterMaintenanceFactory.create(
        session=db_session, user_id=test_printer.user_id, printer_id=test_printer.id,
        maintenance_date="2026-07-01", description="Oldest",
    )
    PrinterMaintenanceFactory.create(
        session=db_session, user_id=test_printer.user_id, printer_id=test_printer.id,
        maintenance_date="2026-07-15", description="Middle",
    )
    PrinterMaintenanceFactory.create(
        session=db_session, user_id=test_printer.user_id, printer_id=test_printer.id,
        maintenance_date="2026-07-10", description="Also old",
    )

    response = client.get(f"/api/printers/{test_printer.id}/maintenance", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert [m["description"] for m in data] == ["Middle", "Also old", "Oldest"]


def test_list_maintenance_foreign_printer_404(client, auth_headers, db_session, other_user):
    foreign = PrinterFactory.create(session=db_session, user_id=other_user.id, name="Foreign")

    response = client.get(f"/api/printers/{foreign.id}/maintenance", headers=auth_headers)
    assert response.status_code == 404
