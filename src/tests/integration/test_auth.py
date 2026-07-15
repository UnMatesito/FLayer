from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

from jose import jwt

from backend.config import settings
from backend.models.otp_code import OtpCode
from backend.models.user import User


VALID_HASH = "$2b$12$.P8W/jo02Xq/Kt.rrHLjouk6NVatKdD9Ghh34J0Jl4AIJuqQHE4BG"


class TestLogin:
    def test_login_valid_credentials(self, client, db_session):
        user = User(
            email="test@example.com",
            name="Test User",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        from backend.services.email_service import email_service
        original = email_service.send_otp
        email_service.send_otp = AsyncMock()

        try:
            resp = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "admin123"},
            )
        finally:
            email_service.send_otp = original

        assert resp.status_code == 200
        data = resp.json()
        assert data["otp_required"] is True
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["name"] == "Test User"
        assert "access_token" in resp.cookies

        cookie = resp.cookies["access_token"]
        payload = jwt.decode(
            cookie, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        assert payload["otp_verified"] is False
        assert payload["sub"] == str(user.id)

    def test_login_invalid_credentials(self, client, db_session):
        user = User(
            email="test@example.com",
            name="Test User",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        resp = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

        resp = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "any"},
        )
        assert resp.status_code == 401

    def test_login_sends_otp(self, client, db_session):
        user = User(
            email="otp-test@example.com",
            name="OTP Test",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        from backend.services.email_service import email_service
        original = email_service.send_otp
        mock = AsyncMock()
        email_service.send_otp = mock

        try:
            resp = client.post(
                "/api/auth/login",
                json={"email": "otp-test@example.com", "password": "admin123"},
            )
            assert resp.status_code == 200
            mock.assert_awaited_once()
        finally:
            email_service.send_otp = original


class TestOtpVerify:
    def test_otp_verify_correct(self, client, db_session):
        user = User(
            email="verify@example.com",
            name="Verify Test",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        otp = OtpCode(
            user_id=user.id,
            code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(otp)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": False},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/otp/verify",
            json={"code": "123456"},
            cookies={"access_token": token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["detail"] == "OTP verified"
        assert "access_token" in resp.cookies

        new_token = resp.cookies["access_token"]
        payload = jwt.decode(
            new_token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        assert payload["otp_verified"] is True
        assert payload["sub"] == str(user.id)

    def test_otp_verify_wrong_code(self, client, db_session):
        user = User(
            email="wrong@example.com",
            name="Wrong Test",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        otp = OtpCode(
            user_id=user.id,
            code="123456",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(otp)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": False},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/otp/verify",
            json={"code": "999999"},
            cookies={"access_token": token},
        )
        assert resp.status_code == 401

    def test_otp_verify_expired(self, client, db_session):
        user = User(
            email="expired@example.com",
            name="Expired Test",
            hashed_password=VALID_HASH,
        )
        db_session.add(user)
        db_session.flush()

        otp = OtpCode(
            user_id=user.id,
            code="123456",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db_session.add(otp)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": False},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/otp/verify",
            json={"code": "123456"},
            cookies={"access_token": token},
        )
        assert resp.status_code == 401


class TestMe:
    def test_me_with_valid_token(self, client, db_session):
        user = User(
            email="me@example.com",
            name="Me Test",
            hashed_password="hash",
        )
        db_session.add(user)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": True},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.get(
            "/api/auth/me",
            cookies={"access_token": token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me@example.com"
        assert data["name"] == "Me Test"

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_unverified_token(self, client, db_session):
        user = User(
            email="unverified@example.com",
            name="Unverified",
            hashed_password="hash",
        )
        db_session.add(user)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": False},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.get(
            "/api/auth/me",
            cookies={"access_token": token},
        )
        assert resp.status_code == 401


class TestRegister:
    def test_register_new_user(self, client, db_session):
        admin = User(
            email="admin-reg@example.com",
            name="Admin",
            hashed_password="hash",
        )
        db_session.add(admin)
        db_session.flush()

        admin_token = jwt.encode(
            {"sub": str(admin.id), "otp_verified": True},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "name": "New User",
                "password": "securepass123",
            },
            cookies={"access_token": admin_token},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@example.com"
        assert data["name"] == "New User"

        from sqlalchemy import select
        result = db_session.execute(
            select(User).where(User.email == "newuser@example.com")
        )
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.name == "New User"

    def test_register_duplicate_email(self, client, db_session):
        existing = User(
            email="existing@example.com",
            name="Existing",
            hashed_password="hash",
        )
        db_session.add(existing)
        db_session.flush()

        admin = User(
            email="admin2@example.com",
            name="Admin 2",
            hashed_password="hash",
        )
        db_session.add(admin)
        db_session.flush()

        admin_token = jwt.encode(
            {"sub": str(admin.id), "otp_verified": True},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/register",
            json={
                "email": "existing@example.com",
                "name": "Duplicate",
                "password": "pass123",
            },
            cookies={"access_token": admin_token},
        )
        assert resp.status_code == 422


class TestLogout:
    def test_logout_clears_cookie(self, client, db_session):
        user = User(
            email="logout@example.com",
            name="Logout Test",
            hashed_password="hash",
        )
        db_session.add(user)
        db_session.flush()

        token = jwt.encode(
            {"sub": str(user.id), "otp_verified": False},
            settings.secret_key,
            algorithm=settings.jwt_algorithm,
        )

        resp = client.post(
            "/api/auth/logout",
            cookies={"access_token": token},
        )
        assert resp.status_code == 200

        set_cookie = resp.headers.get("set-cookie", "")
        assert "access_token=" in set_cookie
        assert "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()
