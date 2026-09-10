import uuid
from pathlib import Path

from jose import jwt

from backend.config import settings
from backend.models.user import User
from tests.factories.user_factory import UserFactory

LOGO_DIR = Path("uploads")


def _upload_path(user_id: uuid.UUID, ext: str) -> Path:
    return LOGO_DIR / f"logo_{user_id}{ext}"


def _favicon_path(user_id: uuid.UUID, ext: str) -> Path:
    return LOGO_DIR / f"favicon_{user_id}{ext}"


def _remove_file(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def _admin_token(db_session) -> tuple[str, User]:
    admin = UserFactory.create(session=db_session, name="Admin")
    token = jwt.encode(
        {"sub": str(admin.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, admin


class TestBrandingAuth:
    def test_patch_me_requires_auth(self, client):
        response = client.patch("/api/auth/me", json={"name": "Hacker"})
        assert response.status_code == 401

    def test_logo_upload_requires_auth(self, client):
        response = client.post(
            "/api/auth/me/logo",
            files={"file": ("logo.png", b"x", "image/png")},
        )
        assert response.status_code == 401

    def test_logo_delete_requires_auth(self, client):
        response = client.delete("/api/auth/me/logo")
        assert response.status_code == 401

    def test_favicon_upload_requires_auth(self, client):
        response = client.post(
            "/api/auth/me/favicon",
            files={"file": ("favicon.png", b"x", "image/png")},
        )
        assert response.status_code == 401

    def test_favicon_delete_requires_auth(self, client):
        response = client.delete("/api/auth/me/favicon")
        assert response.status_code == 401


class TestPatchMe:
    def test_patch_updates_name_and_color(self, client, auth_headers, db_session, test_user):
        response = client.patch(
            "/api/auth/me",
            json={"name": "Ana Gómez", "primary_color": "#e4572e"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["name"] == "Ana Gómez"
        assert data["primary_color"] == "#E4572E"

        db_session.expire_all()
        refreshed = db_session.get(User, test_user.id)
        assert refreshed.name == "Ana Gómez"
        assert refreshed.primary_color == "#E4572E"

    def test_patch_omitted_fields_unchanged(self, client, auth_headers, db_session, test_user):
        test_user.primary_color = "#112233"
        db_session.flush()

        response = client.patch("/api/auth/me", json={"name": "Solo Nombre"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Solo Nombre"
        assert data["primary_color"] == "#112233"

        response = client.patch("/api/auth/me", json={"primary_color": "#AABBCC"}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Solo Nombre"
        assert data["primary_color"] == "#AABBCC"

    def test_patch_empty_name_422(self, client, auth_headers, db_session, test_user):
        for bad in ["", "   "]:
            response = client.patch("/api/auth/me", json={"name": bad}, headers=auth_headers)
            assert response.status_code == 422, f"{bad!r} should be rejected"

        db_session.expire_all()
        assert db_session.get(User, test_user.id).name == test_user.name

    def test_patch_invalid_hex_422(self, client, auth_headers, db_session, test_user):
        for bad in ["#12", "123456", "#GGGGGG", ""]:
            response = client.patch(
                "/api/auth/me",
                json={"primary_color": bad},
                headers=auth_headers,
            )
            assert response.status_code == 422, f"{bad!r} should be rejected"

        db_session.expire_all()
        assert db_session.get(User, test_user.id).primary_color is None

    def test_patch_clears_color_with_null(self, client, auth_headers, db_session, test_user):
        test_user.primary_color = "#E4572E"
        db_session.flush()

        response = client.patch("/api/auth/me", json={"primary_color": None}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["primary_color"] is None

        me = client.get("/api/auth/me", headers=auth_headers)
        assert me.status_code == 200
        assert me.json()["primary_color"] is None

    def test_patch_unknown_field_422(self, client, auth_headers):
        response = client.patch(
            "/api/auth/me",
            json={"user_id": "00000000-0000-0000-0000-000000000099"},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestRegisterColor:
    def test_register_with_optional_color(self, client, db_session):
        admin_token, _ = _admin_token(db_session)

        response = client.post(
            "/api/auth/register",
            json={
                "email": "colored@example.com",
                "name": "Colored",
                "password": "securepass123",
                "primary_color": "#aa44ff",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        assert response.json()["primary_color"] == "#AA44FF"

        from sqlalchemy import select
        result = db_session.execute(select(User).where(User.email == "colored@example.com"))
        user = result.scalar_one()
        assert user.primary_color == "#AA44FF"

    def test_register_omitted_color_null(self, client, db_session):
        admin_token, _ = _admin_token(db_session)

        response = client.post(
            "/api/auth/register",
            json={
                "email": "plain@example.com",
                "name": "Plain",
                "password": "securepass123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        assert response.json()["primary_color"] is None

    def test_register_invalid_color_422(self, client, db_session):
        admin_token, _ = _admin_token(db_session)

        response = client.post(
            "/api/auth/register",
            json={
                "email": "badcolor@example.com",
                "name": "Bad Color",
                "password": "securepass123",
                "primary_color": "#12345",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

        from sqlalchemy import select
        result = db_session.execute(select(User).where(User.email == "badcolor@example.com"))
        assert result.scalar_one_or_none() is None


class TestMeBranding:
    def test_me_returns_branding_fields(self, client, auth_headers, db_session, test_user):
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["primary_color"] is None
        assert data["logo_url"] is None
        assert data["favicon_url"] is None
        assert "logo_path" not in data
        assert "favicon_path" not in data
        assert set(data.keys()) == {"id", "email", "name", "business_name", "primary_color", "logo_url", "favicon_url", "currency"}
        assert data["currency"] == "ARS"


class TestLogoUpload:
    def test_logo_upload_sets_url(self, client, auth_headers, db_session, test_user):
        try:
            response = client.post(
                "/api/auth/me/logo",
                files={"file": ("logo.png", b"fake-png", "image/png")},
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["logo_url"].startswith(f"/uploads/logo_{test_user.id}.png")
            assert _upload_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.logo_path == f"uploads/logo_{test_user.id}.png"

            second = client.post(
                "/api/auth/me/logo",
                files={"file": ("logo.webp", b"fake-webp", "image/webp")},
                headers=auth_headers,
            )
            assert second.status_code == 200
            assert second.json()["logo_url"].startswith(f"/uploads/logo_{test_user.id}.webp")
            assert _upload_path(test_user.id, ".webp").exists()
            assert not _upload_path(test_user.id, ".png").exists()

            me = client.get("/api/auth/me", headers=auth_headers)
            assert me.json()["logo_url"].startswith(f"/uploads/logo_{test_user.id}.webp")
        finally:
            _remove_file(_upload_path(test_user.id, ".png"))
            _remove_file(_upload_path(test_user.id, ".webp"))

    def test_logo_upload_invalid_type_422(self, client, auth_headers, db_session, test_user):
        test_user.logo_path = f"uploads/logo_{test_user.id}.png"
        db_session.flush()
        try:
            response = client.post(
                "/api/auth/me/logo",
                files={"file": ("logo.txt", b"plain text", "text/plain")},
                headers=auth_headers,
            )
            assert response.status_code == 422
            assert not _upload_path(test_user.id, ".bin").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.logo_path == f"uploads/logo_{test_user.id}.png"
        finally:
            _remove_file(_upload_path(test_user.id, ".png"))

    def test_logo_upload_too_large_422(self, client, auth_headers, db_session, test_user):
        test_user.logo_path = f"uploads/logo_{test_user.id}.png"
        db_session.flush()
        try:
            too_big = b"x" * (10 * 1024 * 1024 + 1)
            response = client.post(
                "/api/auth/me/logo",
                files={"file": ("big.png", too_big, "image/png")},
                headers=auth_headers,
            )
            assert response.status_code == 422
            assert not _upload_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.logo_path == f"uploads/logo_{test_user.id}.png"
        finally:
            _remove_file(_upload_path(test_user.id, ".png"))


class TestLogoDelete:
    def test_logo_delete(self, client, auth_headers, db_session, test_user):
        test_user.logo_path = f"uploads/logo_{test_user.id}.png"
        db_session.flush()
        _upload_path(test_user.id, ".png").write_bytes(b"fake-png")
        try:
            response = client.delete("/api/auth/me/logo", headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["logo_url"] is None

            assert not _upload_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.logo_path is None

            me = client.get("/api/auth/me", headers=auth_headers)
            assert me.json()["logo_url"] is None
        finally:
            _remove_file(_upload_path(test_user.id, ".png"))


class TestFaviconUpload:
    def test_favicon_upload_sets_cache_busted_url_and_keeps_logo_separate(self, client, auth_headers, db_session, test_user):
        try:
            response = client.post(
                "/api/auth/me/favicon",
                files={"file": ("favicon.png", b"fake-png", "image/png")},
                headers=auth_headers,
            )
            assert response.status_code == 200
            data = response.json()
            assert data["favicon_url"].startswith(f"/uploads/favicon_{test_user.id}.png?v=")
            assert data["logo_url"] is None
            assert _favicon_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.favicon_path == f"uploads/favicon_{test_user.id}.png"

            second = client.post(
                "/api/auth/me/favicon",
                files={"file": ("favicon.webp", b"fake-webp", "image/webp")},
                headers=auth_headers,
            )
            assert second.status_code == 200
            assert second.json()["favicon_url"].startswith(f"/uploads/favicon_{test_user.id}.webp?v=")
            assert _favicon_path(test_user.id, ".webp").exists()
            assert not _favicon_path(test_user.id, ".png").exists()
        finally:
            _remove_file(_favicon_path(test_user.id, ".png"))
            _remove_file(_favicon_path(test_user.id, ".webp"))

    def test_favicon_invalid_type_422_keeps_previous_file(self, client, auth_headers, db_session, test_user):
        test_user.favicon_path = f"uploads/favicon_{test_user.id}.png"
        db_session.flush()
        _favicon_path(test_user.id, ".png").write_bytes(b"existing")
        try:
            response = client.post(
                "/api/auth/me/favicon",
                files={"file": ("favicon.txt", b"plain", "text/plain")},
                headers=auth_headers,
            )
            assert response.status_code == 422
            assert _favicon_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.favicon_path == f"uploads/favicon_{test_user.id}.png"
        finally:
            _remove_file(_favicon_path(test_user.id, ".png"))


class TestFaviconDelete:
    def test_favicon_delete_clears_field_and_file(self, client, auth_headers, db_session, test_user):
        test_user.favicon_path = f"uploads/favicon_{test_user.id}.png"
        db_session.flush()
        _favicon_path(test_user.id, ".png").write_bytes(b"fake-png")
        try:
            response = client.delete("/api/auth/me/favicon", headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["favicon_url"] is None

            assert not _favicon_path(test_user.id, ".png").exists()

            db_session.expire_all()
            user = db_session.get(User, test_user.id)
            assert user.favicon_path is None

            me = client.get("/api/auth/me", headers=auth_headers)
            assert me.json()["favicon_url"] is None
        finally:
            _remove_file(_favicon_path(test_user.id, ".png"))


class TestCrossUser:
    def test_no_cross_user_profile_access(self, client, auth_headers, db_session, test_user, other_user):
        other_user.primary_color = "#BEEF00"
        other_user.logo_path = f"uploads/logo_{other_user.id}.png"
        other_user.favicon_path = f"uploads/favicon_{other_user.id}.png"
        db_session.flush()

        me = client.get("/api/auth/me", headers=auth_headers)
        assert me.status_code == 200
        data = me.json()
        assert data["id"] == str(test_user.id)
        assert data["primary_color"] is None
        assert data["logo_url"] is None
        assert data["favicon_url"] is None
        assert "#BEEF00" != data["primary_color"]

        response = client.patch(
            "/api/auth/me",
            json={"user_id": str(other_user.id), "primary_color": "#123456"},
            headers=auth_headers,
        )
        assert response.status_code == 422

        db_session.expire_all()
        assert db_session.get(User, other_user.id).primary_color == "#BEEF00"
        assert db_session.get(User, test_user.id).primary_color is None
