# Design — create_order

## Tables (see `docs/data_model.md` for the full schema)

- `customers` (new for this feature)
- `orders` (new for this feature — only columns used up to `status='new'`)
- `order_notes` (new, though not used until the operator adds a note)

`order_status_history` is not created here — that belongs to `order_status`. However,
the `orders.status` column does exist from this feature (default `'new'`).

## Endpoints

| Method | Route | Usage |
|---|---|---|
| `POST` | `/api/public/orders` | Public form (R1, R2, R3, R4) |
| `POST` | `/api/orders` | Manual creation, requires auth (R5) |
| `GET` | `/api/orders?status=active` | Active orders table (R6) |
| `GET` | `/api/orders/{id}` | Order details, requires auth (R18, R19) |
| `PATCH` | `/api/orders/{id}/delivery-cost` | Save delivery-cost fields, requires auth (R22, R23) |

### `POST /api/public/orders` — Request

```json
{
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "work_type": "impresion_3d | diseno_3d",
  "description": "...",
  "files": [{ "filename": "...", "url": "..." }]
}
```

### Validations (R3, R4)

- Email: standard regex + Pydantic `EmailStr`
- Name: non-empty, trimmed
- File: max size 200MB validated before upload (client + server)

## Technical decisions

**Customer is created or reused (not always new).**
Discarded alternative: create a new `customer` for every order. Chosen:
lookup by `email` within the same `user_id`; if exists, reuse
(`UNIQUE(user_id, email)` on `customers`). Avoids duplicate returning customers.

**Files: reference only, no actual upload in this feature.**
The `files` field on `orders` is JSONB with `{filename, url}`. Actual upload
to storage (S3/local) is an infrastructure concern that does not block
this feature — MVP can accept an external link (Drive, WeTransfer) as
a valid `url`. If self-hosted upload is added later, it's an additional
endpoint that populates the same field.

**"Already notified the client" (R5) is a checkbox, not real dedup logic.**
Discarded alternative: track whether the email was sent and prevent
duplicates automatically. Chosen: trust the operator because MVP is
single-user and volume is low (~3 orders/month). Revisit if multi-user.

## Email trigger

This feature calls `email_service.send_order_received(order)` but
**does not implement the email service itself** — that's the responsibility of
`email_notifications`. Here, a simple mock/interface is used:
`EmailService.send(template, to, context)` with real implementation
injected later. Tests for this feature mock `EmailService`.

## Store-token hardening (R7, revision 2026-08-12)

The public endpoints were originally designed to accept token-less intake via
`ANONYMOUS_USER_ID` in `public_store.resolve_user_id_from_token`. Human
decision: intake is only via the shared store link (token) or manual entry —
the anonymous mode is plumbing for a flow that no longer exists and it
fabricates user rows. Defense-in-depth closes it:

- `public_store.py` — `resolve_user_id_from_token`: `token=None` → 404
  "Invalid store token", same response as an unknown token (no scraping
  signal). `ANONYMOUS_USER_ID` removed.
- `orders.py` — `create_public_order`: drop the fabricated-anonymous-user
  branch (lines 172–182); a token whose user is missing → 404, never fabricate.
- `products.py` — `list_public_products` needs no local change (it routes
  through the shared resolver, which now 404s token-less calls).
- Store-token endpoints (owner-only), internal endpoints (cookie auth), email
  flow: untouched.

**Test impact**: the three schema-level 422 tests (invalid email, empty name,
>10 files) validate before the handler runs, so they stay token-less and keep
passing. The four 201 tests in `TestCreateOrderPublic` must attach a valid
store token (new `StoreTokenFactory` + fixture). New tests: missing-token →
404 and unknown-token → 404 for both `/api/public/orders` and
`/api/public/products`.

## Revision 2026-09-09 — intake category and delivery-cost capture (R8-R24)

### Data model changes

Reference `docs/data_model.md`; do not redefine the full `orders` table here.
This revision extends `orders` because the new fields belong to the order
intake and details lifecycle owned by `create_order`.

- Add `orders.order_category` with allowed values `print` and `product`.
- Add `orders.needs_3d_printing` and `orders.needs_3d_modelling` booleans.
- Add `orders.dimensions` as nullable free text.
- Add `orders.type_of_delivery` with allowed values `Presencial acordado` and
  `Delivery`.
- Add nullable delivery-cost fields on `orders`: `delivery_embalaje`,
  `delivery_precio_envio` as numeric/decimal values.

Existing persisted orders are a concrete compatibility case because this is a
revision to a done feature. Migration should backfill `order_category='print'`,
derive `needs_3d_printing` / `needs_3d_modelling` from the existing
`work_type` values where possible, and set `type_of_delivery='Presencial acordado'`
for existing rows.

### Updated order creation request

`POST /api/public/orders` and `POST /api/orders` accept the new fields in
addition to the existing customer, description, and files fields:

```json
{
  "order_category": "print | product",
  "needs_3d_printing": true,
  "needs_3d_modelling": false,
  "dimensions": "largo x ancho x alto en mm",
  "type_of_delivery": "Presencial acordado | Delivery"
}
```

For `print`, at least one of `needs_3d_printing` or `needs_3d_modelling` is
required. When a customer selects `print`, the UI defaults
`needs_3d_printing=true` and `needs_3d_modelling=false`; the customer can change
either checkbox before submitting. For `product`, both print-service booleans are
ignored server-side and stored as `false`.

### Delivery-cost endpoint

`PATCH /api/orders/{id}/delivery-cost` requires an authenticated operator and is
valid only when the order's `type_of_delivery` is `Delivery`.

Request:

```json
{
  "embalaje": 0,
  "precio_envio": 0
}
```

Response: the updated order details payload, including the stored delivery-cost
fields. Numeric values reject non-numeric input and negative values. The endpoint
replaces the two delivery-cost values together so the modal can be edited after
the first save without adding a second table.

### UI flow

```
/order-form
  -> select order category: print | product
  -> print: show 3d printing / 3d modelling checkboxes
  -> product: hide print service checkboxes
  -> show shared details, Dimensions, Type of Delivery
  -> submit order
  -> operator opens order details
  -> Delivery: show Agregar costo de Entrega button
  -> modal saves embalaje, Precio Envio
```

The `Dimensions` field uses the exact helper/reference text:
`largo x ancho x alto en mm (De la pieza mas grande)`.

### Technical decisions

**Add `order_category` instead of reusing `work_type`.**
Discarded alternative: overload `work_type` with `print` and `product`.
Chosen: keep the old field stable for existing R1/R2 behavior and add a new
category because the new print flow can select both `3d printing` and
`3d modelling`.

**Use booleans for print services.**
Discarded alternative: store an array or JSONB service list. Chosen: two fixed
checkboxes are easier to validate, query, and render as explicit booleans.
`needs_3d_printing` starts selected for `print` orders because it is the default
print type; `needs_3d_modelling` starts unselected because modelling is optional
unless the customer explicitly checks it.

**Keep dimensions as free text.**
Discarded alternative: split length, width, and height into numeric columns.
Chosen: the requested input is free text and the reference text is enough for
MVP; structured dimensions can be introduced later if budget formulas need it.

**Store delivery-cost fields on `orders`.**
Discarded alternative: create a `delivery_costs` child table. Chosen: each order
has at most one current delivery-cost set in this workflow, so nullable fields on
`orders` are the smallest correct schema change.

**Show the delivery-cost action only after order creation.**
Discarded alternative: collect delivery cost during public intake. Chosen: the
human explicitly requested the button on the order details page after posting,
so delivery cost remains an operator-side action.
