# Implementation — order_status

## Files Created / Modified

### Backend (new)
- `src/backend/models/order_status.py` — OrderStatus SQLAlchemy model
- `src/backend/schemas/order_status.py` — schemas + VALID_TRANSITIONS map
- `src/backend/api/order_status.py` — GET /api/orders/{id}, PATCH /api/orders/{id}/status, GET /api/order-statuses
- `src/alembic/versions/002_create_order_statuses.py` — migration for order_statuses table + seed
- `src/alembic/versions/003_add_status_fk_to_orders.py` — migration to add FK from orders.status

### Backend (modified)
- `src/backend/models/__init__.py` — added OrderStatus to exports
- `src/backend/main.py` — registered order_status router, seed logic
- `src/backend/models/order.py` — default status="new", FK to order_statuses
- `src/backend/services/email_service.py` — added send_order_status_change to interface + SmtpEmailService
- `src/tests/conftest.py` — imports OrderStatus for seed

### Frontend (new)
- `src/frontend/src/app/dashboard/orders/[id]/page.tsx` — order detail page with status actions
- `src/frontend/src/components/OrdersTable.tsx` — inline status change component

### Frontend (modified)
- `src/frontend/src/app/api.ts` — added OrderDetail type, fetchOrderDetail, updateOrderStatus, fetchOrderStatuses
- `src/frontend/src/app/dashboard/page.tsx` — integrated OrdersTable

### Tests (new)
- `src/tests/integration/test_order_status.py` — 10 tests covering all transitions, invalid transitions, email

## Test Results

All tests pass — valid transitions (new→in_progress, in_progress→ready, ready→delivered, new→cancelled), invalid transitions (new→delivered, delivered→anything, cancelled→anything) return 409, email sent on status change, order detail returns customer info, seeded statuses list.

## Requirements → Test Traceability

| Req | Test | Status |
|-----|------|--------|
| R1 (forward flow) | test_new_to_in_progress, test_in_progress_to_ready, test_ready_to_delivered | ✅ |
| R2 (cancel flow) | test_new_to_cancelled | ✅ |
| R3 (invalid transitions) | test_new_to_delivered_invalid, test_delivered_to_anything_invalid, test_cancelled_to_anything_invalid | ✅ |
| R4 (statuses list) | test_order_statuses_seeded | ✅ |
| R5 (email on change) | test_status_change_sends_email | ✅ |
| R6 (order detail) | test_order_detail_returns_customer_info, test_order_detail_not_found | ✅ |
| R7 (frontend) | manual | ✅ |

## Linter

ruff — 0 errors

## Manual Verification

- [x] Backend: server starts, seed data loads
- [x] Frontend: order detail page renders
- [x] Status changes via dropdown/buttons in OrdersTable
- [x] Email received on status change

## Revision — 2026-09-09: budget required before printing

- Specs updated first in `specs/order_status/{requirements,design,tasks}.md` as R8/R9.
- Backend: `PATCH /api/orders/{order_id}/status` now rejects `quoting → printing` with 409 when no `Budget` exists for that order/user. The guard runs before filament lookup or stock deduction, so failed transitions do not consume stock.
- Backend: when a budget exists, the existing printing transition and stock deduction path continue unchanged, including budget-based gram/filament inference.
- Frontend: `/dashboard/orders/[id]` disables "Iniciar impresión" while the budget query is loading or when no budget exists, and shows a helper message to generate a budget first.
- Tests: `test_quoting_to_printing_without_budget_rejected`; existing printing/stock transition tests now create budget fixtures where the transition is expected to succeed.

### Revision traceability

- R8 ← `test_quoting_to_printing_without_budget_rejected`, `test_quoting_to_printing`, stock printing transition tests
- R9 ← `/dashboard/orders/[id]/page.tsx` disable/helper behavior + frontend build/type-check
