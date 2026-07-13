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
