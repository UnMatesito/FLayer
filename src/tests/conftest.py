import os

TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/flayer_test"
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

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
]

test_engine = create_engine(TEST_DATABASE_URL, echo=False)
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


@pytest.fixture(scope="session", autouse=True)
def db_engine():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
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
