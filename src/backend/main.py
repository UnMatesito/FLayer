from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import create_engine

from backend.api.auth import router as auth_router
from backend.api.orders import router as orders_router
from backend.config import settings
from backend.database import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_url = settings.database_url.replace("+asyncpg", "")
    sync_engine = create_engine(sync_url)
    Base.metadata.create_all(bind=sync_engine)
    sync_engine.dispose()
    yield


app = FastAPI(title="Flayer", version="0.1.0", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(orders_router)
