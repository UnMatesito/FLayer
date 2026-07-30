import pytest

from tests.factories.product_factory import FixedProductFactory


@pytest.fixture
def test_product(db_session, test_user):
    return FixedProductFactory.create(
        session=db_session,
        user_id=test_user.id,
    )


@pytest.fixture
def test_inactive_product(db_session, test_user):
    return FixedProductFactory.create(
        session=db_session,
        user_id=test_user.id,
        is_active=False,
    )
