import pytest

from tests.factories.printer_factory import PrinterFactory
from tests.factories.user_factory import UserFactory


@pytest.fixture
def test_printer(db_session, test_user):
    return PrinterFactory.create(session=db_session, user_id=test_user.id)


@pytest.fixture
def test_inactive_printer(db_session, test_user):
    return PrinterFactory.create(
        session=db_session,
        user_id=test_user.id,
        is_active=False,
    )


@pytest.fixture
def other_user(db_session):
    return UserFactory.create(session=db_session, name="Other User")
