from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.store_token import StoreToken

ANONYMOUS_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


async def resolve_user_id_from_token(
    token: str | None,
    db: AsyncSession,
) -> UUID:
    if token is None:
        return ANONYMOUS_USER_ID

    result = await db.execute(
        select(StoreToken).where(StoreToken.token == token)
    )
    store_token = result.scalar_one_or_none()

    if store_token is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid store token",
        )

    return store_token.user_id
