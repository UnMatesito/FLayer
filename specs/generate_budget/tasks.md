# Tasks — generate_budget

## Backend

- [ ] Migration: `budget_parameters` table + seed defaults (R1, R2, R3, R4)
- [ ] Migration: `budgets` table (R5, R7, R8, R9)
- [ ] SQLAlchemy model `BudgetParameter` (R1, R2, R3)
- [ ] SQLAlchemy model `Budget` (R5, R7)
- [ ] Pydantic schemas: `BudgetParameterUpsert`, `BudgetParameterResponse`, `BudgetCreate`, `BudgetUpdate`, `BudgetStatusUpdate`, `BudgetResponse`, `BudgetPreviewRequest` (R1–R13)
- [ ] Service: `BudgetCalculator` — implements formula with parameter lookups (R5)
- [ ] `GET /api/budget-parameters` — return all parameters for current user (R1, R2, R3)
- [ ] `PUT /api/budget-parameters` — upsert, validate > 0, reset to default on null (R1, R2, R3, R10)
- [ ] `POST /api/orders/{order_id}/budget` — create with calculation, validate grams>0 (R5, R6, R7, R11)
- [ ] `GET /api/orders/{order_id}/budget` — return latest budget version (R12, R13)
- [ ] `PUT /api/orders/{order_id}/budget` — update grams/hours/notes/manual_price, recalculate (R5, R6)
- [ ] `PATCH /api/orders/{order_id}/budget/status` — status transitions with validation (R8, R9)
- [ ] `POST /api/orders/{order_id}/budget/preview` — calculate without persisting (R5)
- [ ] Status transition: `sent` → call `email_service.send_budget_provided()` mock (R8)
- [ ] Status transition: `approved` → update `orders.status` to `approved` (R9)

## Frontend

- [ ] Add budget types and all API functions to `api.ts` (R1–R13)
- [ ] Create `BudgetParametersPage` — form to edit all parameters with validation (R1, R2, R3, R10)
- [ ] Create `OrderDetailPage` at `/dashboard/orders/[id]` with order info + budget section (R12, R13)
- [ ] Create `BudgetForm` component — grams/hours/minutes/margin_type inputs + manual price override (R5, R6, R11)
- [ ] Create `BudgetBreakdown` component — read-only display of calculated costs (R12)
- [ ] Update `ActiveOrdersTable` — add budget status column and "Presupuestar" action (R12, R13)
- [ ] Add navigation link to budget parameters in dashboard (R1)
- [ ] Wire Send/Approve/Reject actions with status mutation + invalidation (R8, R9)

## Tests

- [ ] `test_budget_parameters_get_empty` — fresh user gets defaults (R4)
- [ ] `test_budget_parameters_upsert` — valid update persists (R1)
- [ ] `test_budget_parameters_invalid_negative` — rejected (R10)
- [ ] `test_budget_parameters_reset_to_default` — null value resets (R1)
- [ ] `test_create_budget_calculates_correctly` — verify math with known inputs (R5)
- [ ] `test_create_budget_grams_zero` — rejected (R11)
- [ ] `test_create_budget_negative_hours` — rejected (R11)
- [ ] `test_create_budget_status_draft` — created as draft (R7)
- [ ] `test_update_budget_recalculates` — change grams, verify new total (R5)
- [ ] `test_manual_price_override` — final_price = manual_price (R6)
- [ ] `test_status_transition_draft_to_sent` — valid (R8)
- [ ] `test_status_transition_sent_to_approved` — valid + order status update (R9)
- [ ] `test_status_transition_sent_to_rejected` — valid (R9)
- [ ] `test_status_transition_draft_to_approved` — rejected (invalid transition) (R9)
- [ ] `test_get_budget_nonexistent_order` — 404 (R13)
- [ ] `test_get_budget_no_budget` — 404 or empty (R13)
- [ ] `test_budget_preview_no_persist` — preview doesn't create DB row (R5)

Estimated total: ~16h (backend 8h, frontend 5h, tests 3h)
