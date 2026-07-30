# Tasks — product_management

## Backend

- [x] Migration: `fixed_products` table (R1, R2, R3, R5)
- [x] Migration: add `fixed_product_id` column to `orders` table (R8)
- [x] Pydantic model: `ProductCreate`, `ProductUpdate`, `ProductResponse` (R1, R4, R6)
- [x] `POST /api/products` — create with validations (R1, R4, R6)
- [x] `GET /api/products` — list with optional `show_inactive` param (R2)
- [x] `GET /api/products/{id}` — get single product (R7)
- [x] `PATCH /api/products/{id}` — partial update, re-validate price ≥ 0 (R3, R4)
- [x] `DELETE /api/products/{id}` — soft-delete (`is_active = false`) (R5)
- [x] Modify `POST /api/orders` to accept `fixed_product_id`, auto-set total (R8)
- [x] Storage service helper (local disk for MVP, swappable to SeaweedFS) (R9, R10)
- [x] `POST /api/products/{id}/image` — multipart upload, type/size validation, local disk storage (R9, R10)

## Tests

- [x] `test_create_product_valid` (R1)
- [x] `test_list_active_products_excludes_inactive` (R2)
- [x] `test_list_products_sorted_by_name` (R2 — extra)
- [x] `test_list_products_show_inactive` (R2 — extra)
- [x] `test_update_product_fields` (R3)
- [x] `test_create_product_negative_price_rejected` (R4)
- [x] `test_update_product_negative_price_rejected` (R4)
- [x] `test_soft_delete_product` (R5)
- [x] `test_create_product_empty_name_rejected` (R6)
- [x] `test_update_product_empty_name_rejected` (R6 — PATCH)
- [x] `test_get_product_by_id_includes_inactive` (R7)
- [x] `test_get_product_by_id_not_found` (R7 — extra)
- [x] `test_order_with_fixed_product_id_sets_total` (R8)
- [x] `test_order_references_nonexistent_product_rejected` (R8 — error case)
- [x] `test_upload_product_image_valid` (R9)
- [x] `test_upload_product_image_invalid_type` (R10)
- [x] `test_upload_product_image_too_large` (R10)

## Frontend

- [x] Product types + API functions in `api.ts` (Product, ProductCreate, ProductUpdate, fetchProducts, createProduct, fetchProduct, updateProduct, deleteProduct)
- [x] Product list page at `/dashboard/products` with create dialog, archive/restore
- [x] Product detail page at `/dashboard/products/[id]` with edit fields, archive/activate
- [x] Nav link "Productos" in dashboard sidebar

Estimated total: ~12h