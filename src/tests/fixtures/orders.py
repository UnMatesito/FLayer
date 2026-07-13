import pytest

from tests.factories.order_factory import OrderFactory


@pytest.fixture
def order_factory(db_session):
    def _make(**kwargs):
        return OrderFactory.create(session=db_session, **kwargs)
    return _make
