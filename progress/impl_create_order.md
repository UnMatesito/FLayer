# Implementation — create_order

## Files Created

### Backend (`src/`)
- `src/__init__.py`
- `src/config.py` — Pydantic settings (DB URL, JWT secret)
- `src/database.py` — SQLAlchemy async engine + session + Base
- `src/main.py` — FastAPI app
- `src/models/__init__.py`
- `src/models/user.py` — `User` model (minimal, for auth dependency)
- `src/models/customer.py` — `Customer` model
- `src/models/order.py` — `Order` + `OrderNote` models
- `src/schemas/__init__.py`
- `src/schemas/order.py` — `CustomerCreate`, `OrderCreate`, `OrderResponse`, `PublicOrderCreate`
- `src/services/__init__.py`
- `src/services/email_service.py` — `EmailService` ABC + `MockEmailService`
- `src/api/__init__.py`
- `src/api/deps.py` — `get_current_user` JWT auth dependency
- `src/api/orders.py` — 3 endpoints (public POST, internal POST, GET active)
- `alembic.ini`
- `alembic/env.py`
- `alembic/script.py.mako`
- `alembic/versions/001_create_orders_tables.py`

### Tests
- `tests/__init__.py`
- `tests/conftest.py`
- `tests/test_orders.py` — 8 tests covering R1–R6 + customer reuse

### Frontend (`frontend/`)
- `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
- `src/app/theme.ts` — MUI v7 theme
- `src/app/providers.tsx` — QueryClient + ThemeProvider + CssBaseline
- `src/app/layout.tsx` — Root layout
- `src/app/api.ts` — API client (fetch wrapper)
- `src/app/page.tsx` — Landing page
- `src/app/order-form/page.tsx` — Public order form page
- `src/app/dashboard/page.tsx` — Dashboard (auth token input + internal form + active orders table)
- `src/components/OrderForm.tsx` — Public order form component
- `src/components/InternalOrderForm.tsx` — Internal order form component
- `src/components/ActiveOrdersTable.tsx` — Active orders table component

## Test Results

```
tests/test_orders.py::TestCreateOrderPublic::test_create_order_impresion3d_valid PASSED
tests/test_orders.py::TestCreateOrderPublic::test_create_order_diseno3d_valid PASSED
tests/test_orders.py::TestCreateOrderPublic::test_create_order_invalid_email PASSED
tests/test_orders.py::TestCreateOrderPublic::test_create_order_empty_name PASSED
tests/test_orders.py::TestCreateOrderPublic::test_create_order_file_too_large PASSED
tests/test_orders.py::TestCreateOrderPublic::test_customer_reused_by_email PASSED
tests/test_orders.py::TestCreateOrderInternal::test_create_order_manual_skip_email PASSED
tests/test_orders.py::TestListOrders::test_active_orders_sorted_desc PASSED
```

## Requirements → Test Traceability

| Req | Test | Status |
|-----|------|--------|
| R1 (3D Printing form) | `test_create_order_impresion3d_valid` | ✅ |
| R2 (3D Design form) | `test_create_order_diseno3d_valid` | ✅ |
| R3 (email validation) | `test_create_order_invalid_email` | ✅ |
| R3 (name validation) | `test_create_order_empty_name` | ✅ |
| R4 (file size/limit) | `test_create_order_file_too_large` | ✅ |
| R5 (manual, skip email) | `test_create_order_manual_skip_email` | ✅ |
| R6 (active orders sorted) | `test_active_orders_sorted_desc` | ✅ |
| Design: customer reuse | `test_customer_reused_by_email` | ✅ |

## Linter

```
ruff — 0 errors
```

## Manual Verification

- [x] Backend: `uvicorn src.main:app` — confirm server starts
- [x] Frontend: `pnpm dev` — confirm `/order-form` renders
- [x] Submit public order form against running backend
- [x] Confirm order appears in DB
- [x] Confirm dashboard loads with token
- [x] Email received in Mailpit at http://localhost:8025

---

# Revision 2026-09-09 — intake category and delivery-cost capture (R8-R24)

## Files Created (NEW)

- `src/alembic/versions/021_add_order_intake_fields.py` — migration 021
  (down_revision `020`): 7 new `orders` columns; backfills `order_category`,
  `type_of_delivery`, and print-service booleans from `work_type`; check
  constraints `ck_orders_order_category_valid`,
  `ck_orders_delivery_type_valid`, `ck_orders_delivery_embalaje_non_negative`,
  `ck_orders_delivery_envio_non_negative`
- `src/frontend/src/components/DeliveryCostDialog.tsx` — modal with numeric
  `embalaje` + `Precio Envio` inputs (no `Peso`), client-side non-numeric /
  negative rejection, `PATCH /api/orders/{id}/delivery-cost` on save
- `src/frontend/src/components/OrderForm.test.tsx` — category-first flow tests
  (R8–R17, R24)
- `src/frontend/src/components/DeliveryCostDialog.test.tsx` — modal tests
  (R20, R21)
- `src/frontend/src/app/dashboard/orders/[id]/page.test.tsx` — order detail page
  tests for delivery-cost button visibility (R18, R19)

## Files Touched (MODIFIED)

- `src/backend/models/order.py` — new columns + `__table_args__`
  `CheckConstraint`s
- `src/backend/schemas/order.py` — `OrderCreate`/`PublicOrderCreate` intake
  fields, `strip_dimensions` + `validate_print_services` validators,
  `DeliveryCostUpdate`, `DELIVERY_TYPES`; `OrderResponse` new fields
- `src/backend/api/orders.py` — persist new fields on both POST endpoints;
  new `PATCH /api/orders/{order_id}/delivery-cost` (401/404/409/422,
  `OrderDetailResponse`); E712 fix in `FixedProduct` filter
- `src/tests/integration/test_orders.py` — `TestCreateOrderCategoryRevision`,
  `TestCreateOrderInternalRevision`, `TestDeliveryCost`
- `src/tests/integration/test_order_status.py` — `test_order_detail_returns_revision_fields`
- `src/tests/integration/test_products.py` — product-order payloads gained
  `order_category`/`type_of_delivery`; unused `pytest` import removed
- `src/tests/factories/schema_factories.py` — `OrderCreateFactory` /
  `PublicOrderCreateFactory` derive `order_category`/`needs_*` from
  `work_type`, `type_of_delivery` default
- `src/tests/factories/order_factory.py` — `OrderFactory` new defaults
- `docs/data_model.md` — new "orders (intake columns, create_order)" section
- `src/frontend/src/app/api.ts` — `OrderCategory`, `DeliveryType`,
  `DELIVERY_TYPE_OPTIONS`, `OrderPayload`/`Order` new fields,
  `DeliveryCostPayload` + `updateDeliveryCost(orderId, payload)`
- `src/frontend/src/components/OrderForm.tsx` — category-first rewrite
  (R8–R17, R24)
- `src/frontend/src/components/InternalOrderForm.tsx` — mirrors new fields,
  derives `work_type`, client-side validation
- `src/frontend/src/app/dashboard/orders/[id]/page.tsx` — detail rows for
  category/services/dimensions/entrega; `Agregar costo de Entrega` card +
  `DeliveryCostDialog` for delivery orders
- `specs/create_order/tasks.md` — revision R8–R24 tasks checked

## Requirements → Test Traceability

| Req | Test | Status |
|-----|------|--------|
| R8 (category options) | `OrderForm.test.tsx` R8 | ✅ |
| R9 (inputs hidden until category) | `OrderForm.test.tsx` R9 | ✅ |
| R10 (submit without category blocked) | `OrderForm.test.tsx` R10 | ✅ |
| R11 (print shows both checkboxes) | `OrderForm.test.tsx` R11 | ✅ |
| R12 (product hides checkboxes) | `OrderForm.test.tsx` R12 | ✅ |
| R13 (at least one print service) | `OrderForm.test.tsx` R13 | ✅ |
| R14 (dimensions helper text) | `OrderForm.test.tsx` R14 | ✅ |
| R15 (dimensions + intake in payload) | `OrderForm.test.tsx` R15 | ✅ |
| R16 (delivery selector w/ two values) | `OrderForm.test.tsx` R16 | ✅ |
| R17 (delivery type required) | `OrderForm.test.tsx` R17 | ✅ |
| R18/R19 (delivery button visible/hidden) | `page.test.tsx` R18 (button present for Delivery) + R19 (button absent for Presencial acordado) | ✅ |
| R20 (modal numeric inputs, no Peso) | `DeliveryCostDialog.test.tsx` R20 | ✅ |
| R21 (non-numeric rejected client-side) | `DeliveryCostDialog.test.tsx` R21 | ✅ |
| R22 (backend persists delivery costs) | `TestDeliveryCost` (backend) | ✅ |
| R23 (endpoint errors: 409/404/422/401) | `TestDeliveryCost` (backend) | ✅ |
| R24 (defaults: printing checked, modelling not) | `OrderForm.test.tsx` R24 | ✅ |
| Backend creation validation + persistence | `TestCreateOrderCategoryRevision` / `TestCreateOrderInternalRevision` | ✅ |

## Test Results

```
backend: 230 passed in 7.55s   (baseline was 214)
frontend: 22 passed (5 files)  OrderForm + DeliveryCostDialog + OrderDetail + existing
npx tsc --noEmit: clean
pnpm build: success
ruff (touched backend files): All checks passed!
```

## Manual Verification

- [x] Backend: run migration `021` upgrade → `poetry run alembic upgrade head` on dev DB
- [x] Backend: confirm `PATCH /api/orders/{id}/delivery-cost` 401/404/409/422 behaviors with a real token
- [x] Frontend: `/order-form` — select `print`, default checkboxes, dimensions helper text, delivery selector
- [x] Frontend: submit print order w/o service → client-side error, no request
- [x] Frontend: dashboard order detail for a `Delivery` order shows `Agregar costo de Entrega`; pickup order does not
- [x] Frontend: modal rejects non-numeric / negative values; valid save persists and refreshes detail

(Manual verification completed by the human 2026-09-09 — feature closed.)

## Reviewer Verdict

- (none yet)

## Implementer follow-up — review rejection 2026-09-09

Reviewer rejected R18/R19: no automated test for delivery-cost button visibility.

**Added:** `src/frontend/src/app/dashboard/orders/[id]/page.test.tsx`

- R18: renders page with `type_of_delivery: 'Delivery'`, asserts `Agregar costo de Entrega` button is present.
- R19: renders page with `type_of_delivery: 'Presencial acordado'`, asserts button is absent.
- Test wraps page in `QueryClientProvider` + `ThemeProvider`, mocks `fetchOrderDetail`/`fetchBudget`/`updateOrderStatus`, stubs `ProtectedRoute` and `useAuth`.
- All 22 frontend tests pass, tsc clean, build success, backend 230 passed, init.sh green.

## Reviewer verdict — re-review 2026-09-09

**APPROVED** — full feature incl. R8-R24 revision and this re-review.

| Check | Result |
|---|---|
| `pnpm test` (frontend) | 22 passed (5 files) |
| `npx tsc --noEmit` | clean |
| `pnpm build` | success |
| `pytest` (backend) | 230 passed |
| `init.sh` | ✓ Verification OK |
| R18/R19 automated test | ✅ Present — `page.test.tsx` asserts button present/absent per delivery type |
| Traceability R18/R19 | ✅ Points to `page.test.tsx` R18/R19 (not production code) |
| Other traceability rows | ✅ All unchanged, all R<n> mapped to real tests |
| Specs edited by implementer? | No |
| All R8-R24 tasks checked in `tasks.md`? | Yes |
