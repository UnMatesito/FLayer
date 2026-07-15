import pytest
from jose import jwt

from backend.config import settings


@pytest.fixture
def auth_headers(test_user):
    token = jwt.encode(
        {"sub": str(test_user.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_cookies(test_user):
    token = jwt.encode(
        {"sub": str(test_user.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"access_token": token}


@pytest.fixture
def unverified_cookies(test_user):
    token = jwt.encode(
        {"sub": str(test_user.id), "otp_verified": False},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"access_token": token}


@pytest.fixture
def admin_auth_headers(admin_user):
    token = jwt.encode(
        {"sub": str(admin_user.id), "otp_verified": True},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return {"Authorization": f"Bearer {token}"}
