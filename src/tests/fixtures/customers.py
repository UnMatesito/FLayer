import pytest

from tests.factories.customer_factory import CustomerFactory


@pytest.fixture
def customer(db_session, test_user):
    return CustomerFactory.create(session=db_session, user_id=test_user.id)


@pytest.fixture
def customer_factory(db_session):
    def _make(**kwargs):
        return CustomerFactory.create(session=db_session, **kwargs)
    return _make
