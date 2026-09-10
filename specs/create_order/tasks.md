# Tasks — create_order

- [ ] Migration: `customers` table (R1, R2, R5)
- [ ] Migration: `orders` table (columns up to `status`) (R1, R2, R5, R6)
- [ ] Migration: `order_notes` table (empty for now, structure only) (R6)
- [ ] Pydantic model `CustomerCreate`, `OrderCreate` with validations (R3, R4)
- [ ] `POST /api/public/orders` — reuse/create customer logic (R1, R2)
- [ ] `POST /api/public/orders` — file validation (size, type) (R4)
- [ ] `POST /api/orders` (internal, with auth) + "already notified" checkbox (R5)
- [ ] `EmailService` mock/interface + call to `send_order_received` (R1, R2)
- [ ] `GET /api/orders?status=active` with descending date sort (R6)
- [ ] Tests:
  - [ ] `test_create_order_impresion3d_valid` (R1)
  - [ ] `test_create_order_diseno3d_valid` (R2)
  - [ ] `test_create_order_invalid_email` (R3)
  - [ ] `test_create_order_empty_name` (R3)
  - [ ] `test_create_order_file_too_large` (R4)
  - [ ] `test_create_order_manual_skip_email` (R5)
  - [ ] `test_active_orders_sorted_desc` (R6)
  - [ ] `test_customer_reused_by_email` (design decision, no direct R — document anyway)

Estimated total: ~8h

## Revision 2026-08-12 — store-token hardening (R7)

- [x] `api/public_store.py`: `resolve_user_id_from_token` — token `None` → 404
      "Invalid store token" (identical to unknown token); remove
      `ANONYMOUS_USER_ID` (R7)
- [x] `api/orders.py`: `create_public_order` — remove the anonymous-user
      fabrication branch; missing user → 404, never fabricate (R7)
- [x] Tests: `StoreTokenFactory` + fixture; update the four 201 tests
      (`impresion3d`, `diseno3d`, `reused_by_email` ×2) to attach a valid
      token; new missing-token / unknown-token → 404 tests for
      `/api/public/orders` and `/api/public/products` (R7)
- [x] Verify: backend `pytest` passes — updated + new tests (R7)

## Revision 2026-09-09 — intake category and delivery-cost capture (R8-R24)

- [x] Migration (1-2h): extend `orders` with order category, print-service booleans,
      dimensions, delivery type, and delivery-cost fields; backfill existing
      rows (R8, R11, R12, R15, R16, R22)
- [x] Backend schemas (1-2h): validate `order_category`, print-service checkbox rules,
      `dimensions`, and `type_of_delivery` for public and internal order
      creation (R8, R10, R13, R14, R16, R17)
- [x] Backend order creation (1-2h): persist category, print-service booleans,
      dimensions, and delivery type; force product orders to store print
      services as false (R11, R12, R15, R16)
- [x] Backend order details (1-2h): return the new order fields and expose delivery
      action state from `GET /api/orders/{id}` (R18, R19)
- [x] Backend delivery-cost endpoint (2-3h): implement authenticated
      `PATCH /api/orders/{id}/delivery-cost` with numeric validation and
      delivery-only enforcement (R21, R22, R23)
- [x] Frontend order form category step (1-2h): add first-step `print` / `product` selection and hide
      category-specific inputs until selection (R8, R9, R10)
- [x] Frontend order form print services (1-2h): show `3d printing` and `3d modelling` checkboxes for
      `print`, default `3d printing` selected and `3d modelling` unselected,
      hide them for `product`, and enforce at least one print service
      (R11, R12, R13, R24)
- [x] Frontend order form dimensions (1h): add `Dimensions` free-text input with exact reference
      text and include it in submit payloads (R14, R15)
- [x] Frontend order form delivery type (1h): add required `Type of Delivery` selector with the two
      allowed values and include it in submit payloads (R16, R17)
- [x] Frontend order details delivery action (1-2h): show `Agregar costo de Entrega` only for delivery
      orders and open the delivery-cost modal from that button (R18, R19, R20)
- [x] Frontend delivery-cost modal (1-2h): render numeric `embalaje` and
      `Precio Envio` inputs; reject non-numeric submit client-side (R20, R21)
- [x] Backend tests for order creation (2-3h): validation and persistence coverage for
      category, print services, dimensions, and delivery type (R8, R10-R17)
- [x] Backend tests for delivery costs (2-3h): endpoint coverage for valid delivery orders,
      invalid numeric values, and pickup-order rejection (R21, R22, R23)
- [x] Frontend tests for order form (2-3h): category-first flow, conditional print service
      controls, default print-service selection, dimensions helper text, and
      delivery type validation (R8-R17, R24)
- [x] Frontend tests for order details (1-2h): delivery-cost button visibility and modal
      field rendering (R18, R19, R20)
