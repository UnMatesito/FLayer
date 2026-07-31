import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.api.deps import get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models.store_token import StoreToken
from backend.models.user import User

router = APIRouter()


class StoreTokenResponse(BaseModel):
    token: str
    url: str

    model_config = {"from_attributes": True}


@router.get("/api/store-token", response_model=StoreTokenResponse)
async def get_store_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StoreTokenResponse:
    result = await db.execute(
        select(StoreToken).where(StoreToken.user_id == current_user.id)
    )
    store_token = result.scalar_one_or_none()

    if store_token is None:
        store_token = StoreToken(
            user_id=current_user.id,
            token=uuid.uuid4().hex,
        )
        db.add(store_token)
        await db.commit()
        await db.refresh(store_token)

    frontend_url = settings.frontend_url.rstrip("/")
    url = f"{frontend_url}/order-form?token={store_token.token}"

    return StoreTokenResponse(token=store_token.token, url=url)


@router.post("/api/store-token/regenerate", response_model=StoreTokenResponse)
async def regenerate_store_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StoreTokenResponse:
    result = await db.execute(
        select(StoreToken).where(StoreToken.user_id == current_user.id)
    )
    store_token = result.scalar_one_or_none()

    if store_token is None:
        store_token = StoreToken(
            user_id=current_user.id,
            token=uuid.uuid4().hex,
        )
        db.add(store_token)
    else:
        store_token.token = uuid.uuid4().hex

    await db.commit()
    await db.refresh(store_token)

    frontend_url = settings.frontend_url.rstrip("/")
    url = f"{frontend_url}/order-form?token={store_token.token}"

    return StoreTokenResponse(token=store_token.token, url=url)
