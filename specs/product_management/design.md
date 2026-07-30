# Design — product_management

## Tables (see `docs/data_model.md` for conventions)

### `fixed_products` (created by this feature)

Proposed columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` | Multi-tenant |
| `name` | VARCHAR(255) | NOT NULL | Trimmed, min 1 char |
| `description` | TEXT | nullable | |
| `price` | DECIMAL(12,2) | NOT NULL, `CHECK(price >= 0)` | Zero allowed (free items) |
| `image_url` | VARCHAR(500) | nullable | SeaweedFS Filer path (e.g. `/products/<id>.jpg`) |
| `is_active` | BOOLEAN | NOT NULL, `DEFAULT true` | Soft-delete |
| `created_at` | TIMESTAMP | NOT NULL, `DEFAULT now()` | |
| `updated_at` | TIMESTAMP | NOT NULL, `DEFAULT now()` | |

**Rationale for `price >= 0` (not `> 0`):** Free promotional items (e.g., "first filament spool free with purchase") are valid business cases. Negative is never valid.

### `orders` (modified by this feature — new column)

| Column | Added | Type | Constraints | Notes |
|---|---|---|---|---|
| `fixed_product_id` | New | UUID | nullable, FK → `fixed_products(id)` | `NULL` means custom order |

Existing `orders` columns (`work_type`, `description`, `files`, `status`, etc.) are unchanged. If `fixed_product_id` is set, `work_type` is implicitly `'product'`.

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `POST` | `/api/products` | Required | Create product (R1, R4, R6) |
| `GET` | `/api/products` | Required | List products (R2) |
| `GET` | `/api/products/{id}` | Required | Get single product (R7) |
| `PUT` | `/api/products/{id}` | Required | Update product (R3, R4) |
| `DELETE` | `/api/products/{id}` | Required | Soft-delete product (R5) |
| `POST` | `/api/products/{id}/image` | Required | Upload product image (R9, R10) |

### `POST /api/products` — Request

```json
{
  "name": "PLA Keychain - Spaceship",
  "description": "15x15mm, single color",
  "price": 5.00,
  "image_url": "https://example.com/pla-keychain.jpg"
}
```

`image_url` is optional. `name`, `price` required. `image_url` is set automatically when an image is uploaded via `POST /api/products/{id}/image`.

### `POST /api/products/{id}/image` — Upload image

Multipart form: field `file` (image/jpeg, image/png, image/webp, max 10MB).

1. Validate file type and size
2. Upload to SeaweedFS Filer at `/products/<product_id>.<ext>`
3. Update `fixed_products.image_url` with the Filer path
4. Return `200` with updated product

### `POST /api/products` — Response (201)

```json
{
  "id": "uuid",
  "name": "PLA Keychain - Spaceship",
  "description": "15x15mm, single color",
  "price": 5.00,
  "image_url": "https://example.com/pla-keychain.jpg",
  "is_active": true,
  "created_at": "2026-07-29T10:00:00Z",
  "updated_at": "2026-07-29T10:00:00Z"
}
```

### `GET /api/products` — Query params

| Param | Type | Default | Description |
|---|---|---|---|
| `show_inactive` | boolean | `false` | Include inactive products |

Response (200): array of product objects, sorted by `name` ASC.

### `PUT /api/products/{id}` — Request

Partial update (same shape as POST, all fields optional).

### `DELETE /api/products/{id}` — Response (200)

```json
{
  "id": "uuid",
  "is_active": false
}
```

No hard delete — `is_active` set to `false`.

## Order integration (R8)

When `fixed_product_id` is provided in `POST /api/orders` (existing endpoint from `create_order`):

1. Validate the product exists and `is_active=true` within the same `user_id`
2. If `total` is not explicitly provided, default to the product's `price`
3. Store `fixed_product_id` on the order (new nullable FK column)

This is a **modification** to the existing `POST /api/orders` endpoint, not a new endpoint.

## Technical decisions

**Soft-delete via `is_active`, not hard `DELETE`.**
Discarded: hard delete. Chosen: `is_active` because inactive products may still be referenced by past orders. Consistent with the project-wide soft-delete convention.

**Price is DECIMAL(12,2), stored in cents-equivalent precision but as decimal.**
Discarded: storing as integer cents. Chosen: DECIMAL(12,2) is explicit, readable in DB queries, and avoids off-by-100 errors in reports. Consistent with other amount fields in the project.

**Product is NOT consumed on order.**
Fixed products are catalog items. A keychain model can be sold 100 times — the product listing entry is not "used up." Stock management of physical items (e.g., how many filament spools are in inventory) belongs in `stock_management`, not here.

**SeaweedFS for image storage, not local disk.**
Discarded: local disk, AWS S3. Chosen: SeaweedFS (single-node, S3-compatible) because it runs as a Docker container alongside the stack, requires no cloud account, and exposes both an HTTP Filer API (used by the backend for uploads) and an S3-compatible API (for future migration). Filer path `/products/<id>.ext` is stored in `image_url`. Images are served via a FastAPI proxy endpoint or directly from SeaweedFS Filer.

## Data flow (Create Product)

```
Operator → POST /api/products → Validate (name, price≥0) →
         → INSERT fixed_products → Return 201 with created product
```

## Data flow (Upload Image)

```
Operator → POST /api/products/{id}/image (multipart) →
         → Validate file type/size →
         → Upload to SeaweedFS Filer (PUT /products/<id>.ext) →
         → UPDATE fixed_products SET image_url = Filer path →
         → Return 200 with updated product
```

## Data flow (Product referenced in Order)

```
Operator → POST /api/orders (with fixed_product_id) →
         → Validate product exists + is_active →
         → Set order.total = product.price (if not overridden) →
         → INSERT order with fixed_product_id → Return 201
```