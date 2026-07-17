# Tasks — stock_management

## Backend

### Database & Models

- [x] Migration: add `filaments` table (R1, R2, R3)
- [x] Migration: add `stock_movements` table (R6, R7, R8, R11)
- [x] Migration: add `supplies` table (R4, R5)
- [x] Migration: add `filament_id` and `grams_estimated` columns to `orders` table (R6)
- [x] SQLAlchemy models: `Filament`, `StockMovement`, `Supply` (R1–R12)
- [x] Pydantic schemas: `FilamentCreate`, `FilamentResponse`, `FilamentAdjustRequest`, `FilamentAdjustResponse`, `SupplyCreate`, `SupplyResponse`, `StockMovementResponse`, `StockMovementFilter`, `LowStockResponse` (R1–R12)

### Filament CRUD Endpoints

- [x] `GET /api/filaments` — list active filaments with ordering (R2)
- [x] `POST /api/filaments` — create filament with validation (R1)
- [x] `GET /api/filaments/{filament_id}` — get filament detail (R2)
- [x] `PATCH /api/filaments/{filament_id}` — update filament metadata / archive (R3, R12)

### Weight Adjustment (Atomic)

- [x] `PATCH /api/filaments/{filament_id}/adjust` — atomic weight update + movement log (R3)

### Supply CRUD Endpoints

- [x] `GET /api/supplies` — list active supplies (R5)
- [x] `POST /api/supplies` — create supply (R4)
- [x] `PATCH /api/supplies/{supply_id}` — update supply quantity (R5)

### Stock Movement Log

- [x] `GET /api/stock-movements` — paginated, filterable movement history (R8)
- [x] `GET /api/stock-movements/{filament_id}` — movements for a specific filament (R8) via query param

### Low Stock

- [x] `GET /api/stock/low-stock` — return filaments and supplies below warning thresholds (R9)

### Status Machine Integration

- [x] Extract stock deduction logic into `StockService.deduct(order_id, filament_id, grams, user_id)` with atomic transaction (R6)
- [x] Extract stock reversal logic into `StockService.reverse(order_id, user_id)` with atomic transaction (R7)
- [x] Modify `PATCH /api/orders/{order_id}/status` — call `deduct_stock` on `ready` transition (R6)
- [x] Modify `PATCH /api/orders/{order_id}/status` — call `reverse_stock` on `cancelled` transition if previous status was `ready` (R7)
- [x] Add stock validation on `ready` transition: log warning if insufficient (R10)
- [x] Accept `filament_id` and `grams_estimated` in status change request body (R6)

### Backfill / Migration Consideration

- [x] Ensure existing orders without `filament_id` can still transition status without stock logic interference (R6)

## Frontend

### API Layer

- [x] Add `Filament`, `FilamentCreate`, `FilamentAdjust`, `Supply`, `StockMovement`, `LowStockResponse` types to `api.ts`
- [x] Add API functions: `fetchFilaments`, `createFilament`, `updateFilament`, `adjustFilamentWeight`, `fetchSupplies`, `createSupply`, `updateSupply`, `fetchStockMovements`, `fetchLowStock` (R1–R9)

### Filament Pages

- [x] Create `/dashboard/stock/filaments` page with filament table (color swatch, name, type, weight, price, low stock indicator) (R2, R9)
- [x] Add "Add Filament" dialog/modal (R1)
- [x] Create `/dashboard/stock/filaments/[id]` detail page with info + movement history (R2, R8)
- [x] Add "Adjust Weight" action on filament detail (R3)
- [x] Add "Archive" action on filament row (R12)

### Supply Pages

- [x] Create `/dashboard/stock/supplies` page with supply table (name, quantity, unit, low stock indicator) (R5)
- [x] Add "Add Supply" dialog/modal (R4)

### Stock Movement Log Page

- [x] Create `/dashboard/stock/movements` page with paginated table + filters (R8)

### Order Detail — Stock Integration

- [x] Update order detail page to show assigned filament info (R6)
- [x] Add filament selector to order detail when status → ready transition is initiated (R6)
- [x] Add confirmation dialog when stock is insufficient on ready transition (R10)

### Navigation

- [x] Add "Stock" menu section in dashboard sidebar (R2, R5, R8)
- [x] Add low-stock warning badge to Stock nav item, fetched on navigation load (R9)

## Tests

### Unit / Integration — Backend

- [x] `test_create_filament_valid` (R1)
- [x] `test_create_filament_duplicate_color_name` — 409 (R1)
- [x] `test_list_filaments_active_only` (R2)
- [x] `test_filament_weight_adjust_positive` (R3)
- [x] `test_filament_weight_adjust_negative` (R3)
- [x] `test_filament_weight_adjust_creates_movement` (R3)
- [x] `test_create_supply_valid` (R4)
- [x] `test_update_supply_quantity` (R5)
- [x] `test_stock_deduction_on_ready` — atomic deduction + movement created (R6)
- [x] `test_stock_deduction_oversell_allowed` — negative weight permitted + warning logged (R6, R10)
- [x] `test_stock_reversal_on_ready_to_cancelled` (R7)
- [x] `test_no_reversal_on_new_to_cancelled` — no consumption movements, no reversal (R7)
- [x] `test_stock_movements_paginated` (R8)
- [x] `test_stock_movements_filter_by_type` (R8)
- [x] `test_stock_movements_filter_by_filament` (R8)
- [x] `test_low_stock_filament_detected` (R9)
- [x] `test_low_stock_supply_detected` (R9)
- [x] `test_invalid_movement_type_rejected` — 422 (R11)
- [x] `test_archive_filament_hides_from_list` (R12)
- [x] `test_archive_filament_preserves_movements` (R12)
- [x] `test_ready_transition_without_filament_id` — allowed, no stock deduction (R6)
- [x] `test_status_change_request_body_extended_fields` — filament_id+grams accepted on ready (R6)

### Frontend

- [ ] `test_filament_page_renders_list` (R2)
- [ ] `test_stock_menu_navigation` (R2, R5, R8)
- [ ] `test_low_stock_warning_indicator` (R9)
- [ ] `test_ready_confirmation_dialog_on_low_stock` (R10)

Estimated total: ~30h (backend 14h, frontend 10h, tests 6h)
