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
