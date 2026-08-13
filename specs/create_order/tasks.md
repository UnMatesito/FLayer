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
