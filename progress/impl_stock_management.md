# Implementation — stock_management

## Files modified

- `src/backend/models/filament.py` (NEW)
- `src/backend/models/stock_movement.py` (NEW)
- `src/backend/models/supply.py` (NEW)
- `src/backend/models/__init__.py` (MODIFIED)
- `src/backend/models/order.py` (MODIFIED — added `filament_id`, `grams_estimated`)
- `src/backend/schemas/stock.py` (NEW)
- `src/backend/schemas/order_status.py` (MODIFIED — added `filament_id`, `grams` to `StatusUpdateRequest`)
- `src/backend/services/stock_service.py` (NEW)
- `src/backend/api/stock.py` (NEW)
- `src/backend/api/order_status.py` (MODIFIED — stock hooks on ready/cancelled)
- `src/backend/main.py` (MODIFIED — include stock router)
- `src/alembic/env.py` (MODIFIED — import new models)
- `src/alembic/versions/004_create_stock_tables.py` (NEW)
- `src/tests/test_stock.py` (NEW)
- `src/tests/factories/stock_factories.py` (NEW)
- `src/tests/fixtures/stock.py` (NEW)
- `src/tests/conftest.py` (MODIFIED — register stock fixtures)
- `src/backend/schemas/order.py` (MODIFIED — added `filament_id`, `grams_estimated` to response)
- `src/frontend/src/app/api.ts` (MODIFIED — added stock types and API functions, updated `updateOrderStatus`)
- `src/frontend/src/app/dashboard/layout.tsx` (NEW — sidebar navigation with low-stock badge)
- `src/frontend/src/app/dashboard/stock/filaments/page.tsx` (NEW)
- `src/frontend/src/app/dashboard/stock/filaments/[id]/page.tsx` (NEW)
- `src/frontend/src/app/dashboard/stock/supplies/page.tsx` (NEW)
- `src/frontend/src/app/dashboard/stock/movements/page.tsx` (NEW)
- `src/frontend/src/app/dashboard/orders/[id]/page.tsx` (MODIFIED — stock integration)

## Traceability R<n> → test

| Requirement | Test |
|---|---|
| R1 | `test_create_filament_valid`, `test_create_filament_duplicate_color_name` |
| R2 | `test_list_filaments_active_only`, `test_get_filament_detail` |
| R3 | `test_filament_weight_adjust_positive`, `test_filament_weight_adjust_negative`, `test_filament_weight_adjust_creates_movement` |
| R4 | `test_create_supply_valid` |
| R5 | `test_update_supply_quantity`, `test_get_supply_detail` |
| R6 | `test_stock_deduction_on_ready`, `test_stock_deduction_oversell_allowed`, `test_status_change_request_body_extended_fields` |
| R7 | `test_stock_reversal_on_ready_to_cancelled`, `test_no_reversal_on_new_to_cancelled` |
| R8 | `test_stock_movements_paginated`, `test_stock_movements_filter_by_type`, `test_stock_movements_filter_by_filament` |
| R9 | `test_low_stock_filament_detected`, `test_low_stock_supply_detected` |
| R10 | `test_stock_deduction_oversell_allowed` |
| R11 | `test_invalid_movement_type_rejected` |
| R12 | `test_archive_filament_hides_from_list`, `test_archive_filament_preserves_movements` |

## Manual verification

- [x] Backend tests pass: `pytest tests/` → 57 passed
- [x] Existing tests unaffected: `test_orders.py`, `test_order_status.py` all pass
- [x] Alembic migration generated: `004_create_stock_tables.py`
- [x] Frontend builds: `next build` → 10 routes compiled successfully
- [x] Frontend: dashboard layout with sidebar navigation + low-stock badge
- [x] Frontend: filament list page with table + "Add Filament" dialog (R1, R2, R9)
- [x] Frontend: filament detail page with adjust weight + archive + movement history (R3, R8, R12)
- [x] Frontend: supply list page with inline quantity editing + "Add Supply" dialog (R4, R5)
- [x] Frontend: stock movement log page with filters (R8)
- [x] Frontend: order detail with filament selector on ready transition + low-stock warning dialog (R6, R10)
