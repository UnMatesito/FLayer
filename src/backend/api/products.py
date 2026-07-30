import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_user
from backend.database import get_db
from backend.models.product import FixedProduct
from backend.models.product_stock_movement import ProductStockMovement
from backend.models.user import User
from backend.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from backend.schemas.product_stock import ProductStockAdjust, ProductStockAdjustResponse, ProductStockMovementResponse
from backend.services import storage_service
from backend.services.product_stock_service import product_stock_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/public/products", response_model=list[ProductResponse])
async def list_public_products(
    db: AsyncSession = Depends(get_db),
) -> list[FixedProduct]:
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    query = select(FixedProduct).where(
        FixedProduct.user_id == user_id,
        FixedProduct.is_active == True,
    ).order_by(FixedProduct.name.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/api/products", response_model=list[ProductResponse])
async def list_products(
    show_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FixedProduct]:
    query = select(FixedProduct).where(FixedProduct.user_id == current_user.id)
    if not show_inactive:
        query = query.where(FixedProduct.is_active == True)
    query = query.order_by(FixedProduct.name.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/api/products", response_model=ProductResponse, status_code=201)
async def create_product(
    body: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FixedProduct:
    product = FixedProduct(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        price=body.price,
        image_url=body.image_url,
        stock_quantity=body.stock_quantity,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FixedProduct:
    result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.id == product_id,
            FixedProduct.user_id == current_user.id,
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.patch("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FixedProduct:
    result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.id == product_id,
            FixedProduct.user_id == current_user.id,
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/api/products/{product_id}", response_model=ProductResponse)
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FixedProduct:
    result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.id == product_id,
            FixedProduct.user_id == current_user.id,
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/api/products/{product_id}/image", response_model=ProductResponse)
async def upload_product_image(
    product_id: UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FixedProduct:
    result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.id == product_id,
            FixedProduct.user_id == current_user.id,
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    try:
        path = await storage_service.save_file(file, product_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))

    product.image_url = storage_service.get_file_url(path)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/api/products/{product_id}/stock-movements", response_model=list[ProductStockMovementResponse])
async def list_product_stock_movements(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProductStockMovement]:
    result = await db.execute(
        select(FixedProduct).where(
            FixedProduct.id == product_id,
            FixedProduct.user_id == current_user.id,
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    movements_result = await db.execute(
        select(ProductStockMovement)
        .where(ProductStockMovement.product_id == product_id)
        .order_by(ProductStockMovement.created_at.desc())
    )
    return list(movements_result.scalars().all())


@router.patch("/api/products/{product_id}/adjust", response_model=ProductStockAdjustResponse)
async def adjust_product_stock(
    product_id: UUID,
    body: ProductStockAdjust,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        new_stock, movement_id = await product_stock_service.adjust(
            db=db,
            product_id=product_id,
            delta_quantity=body.delta_quantity,
            user_id=current_user.id,
            notes=body.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return {"id": product_id, "stock_quantity": new_stock, "movement_id": movement_id}
