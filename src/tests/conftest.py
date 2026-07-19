import os

os.environ["APP_ENV"] = "test"

if "DATABASE_URL" not in os.environ:
    user = os.getenv("POSTGRES_TEST_USER", "postgres")
    password = os.getenv("POSTGRES_TEST_PASSWORD", "postgres")
    port = os.getenv("POSTGRES_TEST_PORT", "5433")
    db = os.getenv("POSTGRES_TEST_DB", "flayer_test")
    os.environ["DATABASE_URL"] = f"postgresql://{user}:{password}@localhost:{port}/{db}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from backend.database import Base  # noqa: E402
from backend.main import app  # noqa: E402

pytest_plugins = [
    "tests.fixtures.auth",
    "tests.fixtures.users",
    "tests.fixtures.customers",
    "tests.fixtures.orders",
    "tests.fixtures.stock",
]

test_engine = create_engine(os.environ["DATABASE_URL"], echo=False)
TestSession = sessionmaker(bind=test_engine)

class AsyncSessionWrapper:
    """Wraps a sync SQLAlchemy Session so async routes can use it via await."""

    def __init__(self, session):
        self._session = session

    async def execute(self, *args, **kwargs):
        return self._session.execute(*args, **kwargs)

    def add(self, instance):
        self._session.add(instance)

    async def flush(self):
        self._session.flush()

    async def commit(self):
        self._session.commit()

    async def refresh(self, instance):
        self._session.refresh(instance)


SEED_STATUSES = ["new", "quoting", "printing", "ready", "delivered", "cancelled"]


@pytest.fixture(scope="session", autouse=True)
def db_engine():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestSession()
    from backend.models.order_status import OrderStatus
    for name in SEED_STATUSES:
        session.add(OrderStatus(name=name))
    session.commit()
    session.close()
    yield test_engine


@pytest.fixture
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def db(db_session):
    return AsyncSessionWrapper(db_session)


@pytest.fixture
def client(db):
    from backend.database import get_db
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
