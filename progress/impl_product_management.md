## Files modified
- src/backend/models/product.py (NEW)
- src/backend/schemas/product.py (NEW)
- src/backend/api/products.py (NEW)
- src/backend/services/storage_service.py (NEW)
- src/backend/models/order.py (MODIFIED — added fixed_product_id, total)
- src/backend/schemas/order.py (MODIFIED — added fixed_product_id, total to OrderCreate/OrderResponse)
- src/backend/api/orders.py (MODIFIED — handle fixed_product_id on POST /api/orders)
- src/backend/main.py (MODIFIED — register products_router)
- src/backend/models/__init__.py (MODIFIED — add FixedProduct)
- src/alembic/env.py (MODIFIED — add FixedProduct import)
- tests/factories/product_factory.py (NEW)
- tests/fixtures/products.py (NEW)
- tests/integration/test_products.py (NEW)
- tests/conftest.py (MODIFIED — add products fixture plugin)
- src/alembic/versions/011_create_fixed_products_table.py (NEW)

## Traceability R<n> → test
R1 ← test_create_product_valid
R2 ← test_list_active_products_excludes_inactive, test_list_products_sorted_by_name, test_list_products_show_inactive
R3 ← test_update_product_fields
R4 ← test_create_product_negative_price_rejected, test_update_product_negative_price_rejected
R5 ← test_soft_delete_product
R6 ← test_create_product_empty_name_rejected
R7 ← test_get_product_by_id_includes_inactive, test_get_product_by_id_not_found
R8 ← test_order_with_fixed_product_id_sets_total, test_order_references_nonexistent_product_rejected
R9 ← test_upload_product_image_valid
R10 ← test_upload_product_image_invalid_type, test_upload_product_image_too_large

## Manual verification
- [x] All tests pass: `pytest -q tests/integration/test_products.py` — 16 passed
- [x] All existing tests pass: `pytest -q tests/integration/` — 93 passed total
- [x] Frontend: products list page at `/dashboard/products` with create dialog, archive/restore
- [x] Frontend: product detail page at `/dashboard/products/[id]` with edit, archive/activate
- [x] Frontend: "Productos" nav link in dashboard sidebar
