from fastapi import FastAPI

from backend.api.orders import router as orders_router

app = FastAPI(title="Flayer", version="0.1.0")

app.include_router(orders_router)
