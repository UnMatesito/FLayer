from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import create_engine, text

from backend.api.auth import router as auth_router
from backend.api.order_status import router as order_status_router
from backend.api.orders import router as orders_router
from backend.api.stock import router as stock_router
from backend.config import settings
from backend.database import Base

SEED_STATUSES = ["new", "in_progress", "ready", "delivered", "cancelled"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_env == "dev":
        sync_url = settings.database_url.replace("+asyncpg", "")
        sync_engine = create_engine(sync_url)
        Base.metadata.create_all(bind=sync_engine)
        with sync_engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM order_statuses"))
            count = result.scalar_one()
            if count == 0:
                for name in SEED_STATUSES:
                    conn.execute(
                        text("INSERT INTO order_statuses (name) VALUES (:name)"),
                        {"name": name},
                    )
                conn.commit()
        sync_engine.dispose()
    yield


app = FastAPI(title="Flayer", version="0.1.0", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(orders_router)
app.include_router(order_status_router)
app.include_router(stock_router)
