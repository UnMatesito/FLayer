# Tasks — generate_budget

## Backend

- [x] Migration: `budgets` table with JSONB `filament_items`, no intermediate columns (R1–R10)
- [x] Migration: add `printer_id` (FK → `printers`) + snapshot columns `power_watts`, `lifespan_hours`, `spare_parts_cost` to `budgets` (R11)
- [x] SQLAlchemy model `Budget` (R1–R10)
- [x] SQLAlchemy model: add `printer_id` relationship + snapshot columns (R11)
- [x] Pydantic schemas: `FilamentItemInput`, `FilamentItemResponse`, `BudgetCreate`, `BudgetUpdate`, `BudgetStatusUpdate`, `BudgetResponse`, `BudgetPreviewRequest` (R1–R10)
- [x] Pydantic schemas: optional `printer_id` on `BudgetCreate`/`BudgetUpdate`/`BudgetPreviewRequest`; `printer_id`, `printer_name`, `power_watts`, `lifespan_hours`, `spare_parts_cost` on `BudgetResponse` (R11)
- [x] Service: `BudgetCalculator` — implements formula with hardcoded defaults (R3)
- [x] Service: resolve machine params from printer profile (per-field fallback to currency defaults); snapshot resolved values (R11)
- [x] Service: `calculate_breakdown` accepts resolved `power_watts`/`lifespan_hours`/`spare_parts_cost` and returns them in the breakdown (R11)
- [x] `POST /api/orders/{order_id}/budget` — create with filament items or manual cost, validate (R1, R2, R3, R4, R8)
- [x] `POST /api/orders/{order_id}/budget` — accept `printer_id`, tenant-scoped 404 for foreign/missing printer, persist snapshot (R11)
- [x] `GET /api/orders/{order_id}/budget` — return latest budget with computed breakdown + ml_price (R9, R10)
- [x] `GET /api/orders/{order_id}/budget` — include `printer_name` (joined) + snapshotted machine params (R11)
- [x] `PUT /api/orders/{order_id}/budget` — update filament items/hours/manual_filament_cost/extra_costs/manual_price, recalculate (R1, R2, R3, R4) — R11 review follow-up 2026-07-31: recalc trigger broadened to any calc-affecting field (stale `final_price` on partial PUT fixed)
- [x] `PUT /api/orders/{order_id}/budget` — accept `printer_id` and re-snapshot machine params (R11) — R11 review follow-up 2026-07-31: PUT re-snapshot path now covered by tests (switch/clear/items-only)
- [x] `PATCH /api/orders/{order_id}/budget/status` — status transitions with validation (R6, R7)
- [x] `POST /api/orders/{order_id}/budget/preview` — calculate without persisting (R3)
- [x] `POST /api/orders/{order_id}/budget/preview` — accept `printer_id`, resolve machine params, return them in response (R11)
- [x] Status transition: `sent` → call `email_service.send_budget_provided()` mock (R6)
- [x] Status transition: `approved` → update `orders.status` to `approved` (R7)
- [x] On budget create: snapshot each filament item's `price_per_kg` from products table (R1)

## Frontend

- [x] Add budget types and all API functions to `api.ts` (R1–R10)
- [x] Update budget types in `api.ts`: optional `printer_id` on inputs; `printer_id`, `printer_name`, `power_watts`, `lifespan_hours`, `spare_parts_cost` on `BudgetResponse` (R11)
- [x] Update `OrderDetailPage` at `/dashboard/orders/[id]` with order info + budget section (R9, R10)
- [x] Create `BudgetForm` component — currency selector (ARS/USD), filament items list with product selector + grams, toggle to manual cost, hours/minutes/extra_costs/margin_type inputs, manual price override, notes (R1, R2, R3, R4, R8)
- [x] Add "Impresora" select to `BudgetForm` — populated from `fetchPrinters` (active only), optional, sends `printer_id`; preview reflects selected printer machine params (R11)
- [x] Create `BudgetForm` component — live preview of breakdown including ML price (R3)
- [x] Create `BudgetBreakdown` component — read-only display with filament items list, cost breakdown, status chip, action buttons (R9)
- [x] Show used machine params in `BudgetBreakdown` — printer name (or "por defecto"), watts, lifespan, spare parts cost (R11)
- [x] Update `OrdersTable` — add budget status column and "Presupuestar" action (R9, R10)
- [x] Wire Send/Approve/Reject actions with status mutation + invalidation (R6, R7)

## Tests

- [x] `test_create_budget_with_filament_items` — multiple items, correct calculation (R1, R3)
- [x] `test_create_budget_manual_filament_cost` — overrides items calculation (R2)
- [x] `test_create_budget_no_filaments` — rejected when both items empty and manual null (R8)
- [x] `test_create_budget_grams_zero` — rejected for any filament item (R8)
- [x] `test_create_budget_extra_costs_negative` — rejected (R8)
- [x] `test_create_budget_negative_hours` — rejected (R8)
- [x] `test_create_budget_calculates_correctly` — verify math with known inputs (R3)
- [x] `test_create_budget_status_draft` — created as draft (R5)
- [x] `test_update_budget_recalculates` — change grams on an item, verify new total (R3)
- [x] `test_manual_price_override` — final_price = manual_price (R4)
- [x] `test_filament_price_snapshot` — changing product price later doesn't affect existing budget (R1)
- [x] `test_status_transition_draft_to_sent` — valid (R6)
- [x] `test_status_transition_sent_to_approved` — valid + order status update (R7)
- [x] `test_status_transition_sent_to_rejected` — valid (R7)
- [x] `test_status_transition_draft_to_approved` — rejected (invalid transition) (R7)
- [x] `test_get_budget_nonexistent_order` — 404 (R10)
- [x] `test_get_budget_no_budget` — 404 or empty (R10)
- [x] `test_budget_preview_no_persist` — preview doesn't create DB row (R3)
- [x] `test_budget_response_has_computed_fields` — response includes breakdown + ml_price (R9)
- [x] `test_create_budget_with_printer_profile` — machine params loaded from printer, snapshotted (R11)
- [x] `test_create_budget_without_printer_uses_defaults` — defaults when no printer (R11)
- [x] `test_create_budget_printer_partial_fields_fallback` — NULL profile field falls back to default (R11)
- [x] `test_create_budget_foreign_printer_404` — printer of another user rejected (R11)
- [x] `test_create_budget_nonexistent_printer_404` (R11)
- [x] `test_budget_snapshot_immutable` — editing printer profile later doesn't change budget breakdown (R11)
- [x] `test_preview_with_printer_profile` — preview uses printer params, nothing persisted (R11)
- [x] `test_get_budget_returns_printer_name` — response includes printer name + snapshotted params (R11)
- [x] `test_update_budget_changes_printer_resnapshots` — PUT switch printer → new params in breakdown + row (R11, review follow-up)
- [x] `test_update_budget_clears_printer` — PUT `printer_id: null` → snapshots NULL, defaults used (R11, review follow-up)
- [x] `test_update_budget_items_only_keeps_snapshot` — items-only PUT keeps original snapshot (R11, review follow-up)
- [x] `test_update_budget_final_price_recalculated_on_partial_update` — PUT hours/extra_costs/manual_price-only recalculates stored `final_price` (R1–R4 regression, review follow-up)

Estimated total: R11 addition ~8h (backend 3h, frontend 2h, tests 3h)

## Revision tasks — 2026-09-09

### Backend

- [x] Migration `020`: add post-processing cost columns to `budgets`; remove regional margin multiplier columns from `budget_parameters` (R12, R14)
- [x] Models: add `assembly_cost`, `sanding_cost`, `painting_cost`; remove budget-parameter multiplier fields and checks (R12, R14)
- [x] Schemas: expand margin types, add optional custom `margin_multiplier`, add post-processing fields, remove `ml_price` from responses (R12–R15)
- [x] Service/API: calculate preset/custom margin per budget; add `post_processing_total`; stop computing/returning ML price (R12–R15)
- [x] Tests: presets, custom margin validation, post-processing math/snapshots, ML removal, six-currency update regression (R12–R15)

### Frontend

- [x] API types: remove regional margin fields and `ml_price`; add margin preset union/custom multiplier and post-processing fields (R12–R15)
- [x] Budget form: replace old 3-option margin selector with preset/custom selector and reference copy; add post-processing section (R12–R14)
- [x] Budget breakdown: show selected margin reference and post-processing lines; remove ML suggested price (R12–R15)
- [x] Profile parameters: keep only electricity price and error margin in regional settings (R12)
- [x] Verify: backend pytest, frontend `npx tsc --noEmit`, frontend build, `./init.sh` harness (R12–R15)

## Revision tasks — 2026-09-09 follow-up

- [x] Backend schemas/tests: restore custom margin values outside preset range (`>0..100`) (R13)
- [x] Budget form: replace margin select with preset buttons plus numeric margin input (R13)
- [x] Budget form: add post-processing toggle and submit zero costs when disabled (R14)
- [x] Frontend test infra: Vitest + jsdom + @testing-library/react + user-event, `pnpm test` script (R13–R15)
- [x] Frontend component tests: preset buttons write numeric margin input / exact preset stays active / custom `6` submits `custom` (R13)
- [x] Frontend component test: post-processing toggle-off removes inputs and submits zero costs (R14)
- [x] Frontend component test: no ML suggested price line rendered in form preview and breakdown (R15)
- [x] Progress: R11 added to the R→test traceability map in `progress/impl_generate_budget.md` (R11)
