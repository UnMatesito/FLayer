import pytest

from tests.factories.user_factory import UserFactory


@pytest.fixture
def test_user(db_session):
    return UserFactory.create(session=db_session, name="Test User")


@pytest.fixture
def admin_user(db_session):
    return UserFactory.create(session=db_session, name="Admin User")
