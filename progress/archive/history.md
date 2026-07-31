# Project History — Archived

Append-only logbook. Accessed only when explicitly needed.

---

## Session 1 — [date]

**Feature:** `create_order`
**Transition:** `pending` → `spec_ready`

`spec_author` wrote:
- `specs/create_order/requirements.md` (R1-R6)
- `specs/create_order/design.md`
- `specs/create_order/tasks.md` (6 tasks, ~8h estimated)

Output: waiting for approval from Dev.

## Session 2 — 2026-07-13

**Feature:** `create_order`
**Transition:** `in_progress` → `done`

`implementer` wrote:
- Backend: models, schemas, API endpoints, email service (SMTP via Mailpit), Alembic migration
- Frontend: public order form, internal order form, active orders table, dashboard
- Tests: 8 integration tests, traceability R1-R6

`reviewer` (human):
- Manual verification: form submit ✅, DB row ✅, dashboard ✅, email via Mailpit ✅

Output: marked `done` in `feature_list.json`.

## Session 3 — 2026-07-15

**Feature:** `authentication`
**Transition:** `pending` → `done`

`implementer` wrote:
- Backend: OtpCode model, auth schemas, auth endpoints (login, OTP send/verify, me, register, logout), cookie-based JWT, deps update
- Frontend: AuthProvider + useAuth hook, login/verify-otp pages, ProtectedRoute, dashboard updated to use auth context
- Tests: 12 integration tests covering R1–R14

`reviewer` (human):
- Manual verification: login flow ✅, OTP via Mailpit ✅, logout ✅, protected routes ✅

Output: marked `done` in `feature_list.json`.

## Session 4 — 2026-07-16

**Feature:** `order_status`
**Transition:** `pending` → `done`

`implementer` wrote:
- Backend: OrderStatus model, status schemas + VALID_TRANSITIONS map, 3 endpoints (order detail, status update, list statuses), 2 Alembic migrations
- Frontend: order detail page at `/dashboard/orders/[id]`, inline status change in OrdersTable component
- Tests: 10 integration tests covering valid/invalid transitions, email notification, seeded statuses

`reviewer` (human):
- Manual verification: status transitions ✅, invalid transitions blocked ✅, email on change ✅

Output: marked `done` in `feature_list.json`.

## Session 5 — 2026-07-17

**Feature:** `create_order`
**Transition:** `code_ready` → `done`

Human confirmed finished. Project moved to idle. Next: `generate_budget`.

## Session 6 — 2026-07-17

**Feature:** `stock_management`
**Transition:** `spec_ready` → `done`

`implementer` wrote:
- Backend: Filament model with brand + settings (JSONB), Pydantic schemas, CRUD endpoints, stock movement/tracking, consumption/reversal logic
- Frontend: filament list with create dialog (brand + all print settings), filament detail page with settings editor, order detail page with filament selector for ready marking, archived filaments toggle view
- DB: 3 Alembic migrations (stock tables, brand/settings columns, unique constraint on user_id+color_name+brand)
- Tests: 31 stock tests (creation, duplicate detection with brand+name, weight adjust, stock movements, low stock, oversell, reversal)
- Skills: MUI v7 patterns, filament icon component, color picker input type
- Verification: backend — 62 total tests pass (1.17s), frontend — `next build` compiles 10 routes

`reviewer` (human):
- Manual verification: CRUD filaments ✅, stock adjustments ✅, movement history ✅, settings save/display ✅, archived view toggle ✅

Output: marked `done` in `feature_list.json`.

## Session 7 — 2026-07-18

**Feature:** `generate_budget`
**Transition:** `spec_ready` → `done`

`spec_author` wrote:
- Spec redesign: merged `region_parameters` into `generate_budget`
- Removed `budget_parameters` table, added `filament_items` JSONB, `manual_filament_cost`
- Multi-filament selection from product catalog with price snapshots
- Hardcoded defaults in service (ARS/USD), intermediates computed on read
- Currency selector (ARS/USD) in form

`implementer` wrote:
- Backend: Budget model, Pydantic schemas, BudgetCalculator service, 5 endpoints (POST/GET/PUT/PATCH/preview), status transitions (draft→sent→approved|rejected), Alembic migration
- Frontend: budget types + 5 API functions in api.ts, BudgetForm dialog (currency selector, multi-filament rows, manual cost toggle, live preview), BudgetBreakdown display, order detail page budget section, OrdersTable budget column with Presupuestar action
- Tests: 19 budget integration tests covering all R1–R10
- Coverage: 90%

`reviewer`:
- Full traceability check R1–R10 ✅
- All 38 tasks complete ✅
- pytest 81 passed, coverage 90% ✅
- Verdict: APPROVED

## Session 8 — 2026-07-29

**Feature:** `product_management`
**Transition:** `pending` → `done`

`implementer` wrote:
- Backend: FixedProduct model, schemas, CRUD endpoints, image upload via storage service, `fixed_product_id` + `total` on orders, Alembic migration
- Frontend: products list page, product detail page with stock adjust dialog and image upload, product card grid in order forms
- Tests: 16 integration tests covering R1–R10
- Commit: `ef4fb2c` wip: product management feature

`reviewer` (human):
- Manual verification: CRUD products ✅, image upload ✅, stock adjust ✅, order with fixed product ✅

Output: marked `done` in `feature_list.json`.

## Session 9 — 2026-07-31

**Feature:** public store link (unplanned, part of product_management leftovers)
**Transition:** uncommitted → committed

Uncommitted work from previous sessions committed in one go:
- Backend: StoreToken model, store-token API (get/regenerate), `resolve_user_id_from_token` for public products/orders, FRONTEND_URL setting, allow `new` → `ready` transition for product orders
- Frontend: StoreLink dashboard component (copy/regenerate link), order-form Suspense fix, product stock adjust fixes (error display, missing commit)
- Commit: `92d122c` feat: public store link

## Session 10 — 2026-07-31

**Feature:** orders refactor (maintenance)
**Transition:** uncommitted → committed

- Fixed critical React hooks violation ("Rendered fewer hooks than expected") in `InternalOrderForm` — `useMemo` was called after an early return; also fixed conditional `useQuery` in `BudgetCell`
- Extracted shared order utilities (`src/frontend/src/utils/order.ts`), shared `ProductSelector` component, backend order creation helpers, `has_budget` flag on order list (eliminates N+1 budget queries)
- 94 backend tests pass, frontend `tsc --noEmit` clean
- Commit: `e7b2e5d` refactor: orders

Output: `arquiminis` cancelled by human (feature no longer needed); `printer_profiles` spec written → `spec_ready`.

## Session 11 — 2026-07-31

**Feature:** `printer_profiles` (spec) + agent behavior (docs)
**Transition:** `spec_ready` → committed; rules updated

- `spec_author` wrote `specs/printer_profiles/{requirements,design,tasks}.md` (R1–R14, 29 tasks)
- `feature_list.json`: `arquiminis` → `cancelled`, `printer_profiles` → `spec_ready`; `progress/current.md` updated
- Agent behavior: added "Commit rule" to `AGENTS.md` and `.agents/agents/leader.md` — archive `progress/archive/history.md` BEFORE every commit
- This entry was archived before the commits were made, per the new rule

Output: waiting for human approval of `printer_profiles` spec.
