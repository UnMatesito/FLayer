import pytest

from tests.factories.stock_factories import FilamentFactory, SupplyFactory


@pytest.fixture
def test_filament(db_session, test_user):
    return FilamentFactory.create(
        session=db_session,
        user_id=test_user.id,
    )


@pytest.fixture
def test_low_stock_filament(db_session, test_user):
    return FilamentFactory.create(
        session=db_session,
        user_id=test_user.id,
        weight_grams=50.00,
        min_stock_warning_grams=200.00,
    )


@pytest.fixture
def test_supply(db_session, test_user):
    return SupplyFactory.create(
        session=db_session,
        user_id=test_user.id,
    )


@pytest.fixture
def test_low_stock_supply(db_session, test_user):
    return SupplyFactory.create(
        session=db_session,
        user_id=test_user.id,
        quantity=0.5,
        min_stock_warning=1.0,
    )
