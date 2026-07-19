# Tasks — generate_budget

## Backend

- [x] Migration: `budgets` table with JSONB `filament_items`, no intermediate columns (R1–R10)
- [x] SQLAlchemy model `Budget` (R1–R10)
- [x] Pydantic schemas: `FilamentItemInput`, `FilamentItemResponse`, `BudgetCreate`, `BudgetUpdate`, `BudgetStatusUpdate`, `BudgetResponse`, `BudgetPreviewRequest` (R1–R10)
- [x] Service: `BudgetCalculator` — implements formula with hardcoded defaults (R3)
- [x] `POST /api/orders/{order_id}/budget` — create with filament items or manual cost, validate (R1, R2, R3, R4, R8)
- [x] `GET /api/orders/{order_id}/budget` — return latest budget with computed breakdown + ml_price (R9, R10)
- [x] `PUT /api/orders/{order_id}/budget` — update filament items/hours/manual_filament_cost/extra_costs/manual_price, recalculate (R1, R2, R3, R4)
- [x] `PATCH /api/orders/{order_id}/budget/status` — status transitions with validation (R6, R7)
- [x] `POST /api/orders/{order_id}/budget/preview` — calculate without persisting (R3)
- [x] Status transition: `sent` → call `email_service.send_budget_provided()` mock (R6)
- [x] Status transition: `approved` → update `orders.status` to `approved` (R7)
- [x] On budget create: snapshot each filament item's `price_per_kg` from products table (R1)

## Frontend

- [x] Add budget types and all API functions to `api.ts` (R1–R10)
- [x] Update `OrderDetailPage` at `/dashboard/orders/[id]` with order info + budget section (R9, R10)
- [x] Create `BudgetForm` component — currency selector (ARS/USD), filament items list with product selector + grams, toggle to manual cost, hours/minutes/extra_costs/margin_type inputs, manual price override, notes (R1, R2, R3, R4, R8)
- [x] Create `BudgetForm` component — live preview of breakdown including ML price (R3)
- [x] Create `BudgetBreakdown` component — read-only display with filament items list, cost breakdown, status chip, action buttons (R9)
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

Estimated total: ~14h (backend 7h, frontend 4h, tests 3h)
