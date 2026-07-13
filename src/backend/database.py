from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings


@lru_cache
def get_engine():
    return create_async_engine(settings.database_url, echo=False)


@lru_cache
def get_async_session():
    return async_sessionmaker(get_engine(), expire_on_commit=False)


class Base(AsyncAttrs, DeclarativeBase):
    pass


async def get_db():
    session_maker = get_async_session()
    async with session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
