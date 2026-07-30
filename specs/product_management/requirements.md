# Requirements — product_management

## R1. Create fixed product

GIVEN an authenticated operator on the product management page
WHEN they create a new fixed product with name, price (positive), and optional description
THEN the product is stored in `fixed_products` with `is_active=true`
AND the response includes the created product with its `id`

## R2. List active products

GIVEN one or more fixed products exist (some active, some inactive)
WHEN the authenticated operator requests `GET /api/products` with no filters
THEN only products with `is_active=true` are returned
AND the list is sorted by name alphabetically

## R3. Update fixed product

GIVEN an existing active fixed product
WHEN the authenticated operator updates its name or price
THEN the product's `updated_at` timestamp refreshes
AND the updated fields are persisted in the database

## R4. Negative price rejection

GIVEN an authenticated operator is creating or updating a product
WHEN they submit a price < 0
THEN the request is rejected with HTTP 422
AND no product is created or modified

## R5. Soft-delete (deactivate) product

GIVEN an existing active fixed product
WHEN the authenticated operator deletes it
THEN the product's `is_active` is set to `false`
AND the product is excluded from the default listing

## R6. Empty name rejection

GIVEN an authenticated operator is creating a product
WHEN they submit a name that is empty or only whitespace
THEN the request is rejected with HTTP 422
AND no product is created

## R7. Get single product by ID

GIVEN a fixed product exists (active or inactive)
WHEN the authenticated operator requests `GET /api/products/{id}`
THEN the product is returned regardless of `is_active` status
AND it includes all its fields

## R8. Product referenced in order (traceability)

GIVEN an existing active fixed product
WHEN an order is created with `fixed_product_id` referencing it
THEN the order stores `fixed_product_id`
AND the order's `total` defaults to the product's `price`
AND the product remains available in the catalog (not consumed)

## R9. Upload product image

GIVEN an existing fixed product
WHEN the authenticated operator uploads a JPEG/PNG/WebP image smaller than 20MB via `POST /api/products/{id}/image`
THEN the file is stored in SeaweedFS
AND the product's `image_url` is updated with the Filer path
AND the response includes the updated product

## R10. Invalid image upload rejected

GIVEN an existing fixed product
WHEN the operator uploads a non-image file (e.g., PDF) or an image larger than 20MB
THEN the request is rejected with HTTP 422
AND no file is stored in SeaweedFS
AND `image_url` remains unchanged

## Out of scope for this feature

- Bulk import/export of products
- Stock tracking per product (that's `stock_management`)