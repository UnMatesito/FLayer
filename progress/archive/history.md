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

## Session 12 — 2026-08-04

**Feature:** `printer_profiles` (impl + review) and `generate_budget` R11 (printer select)
**Transition:** `in_progress` → `done`

- `implementer` implemented `printer_profiles` full-stack: backend (8 tenant-scoped endpoints, `Printer`/`PrinterMaintenance` models, schemas with nozzle/machine-param/image validation, printer catalog constant), 2 Alembic migrations (`012`, `013` — chained on true head `46ac01109cd2`), 41 new tests, frontend (card grid, create/edit dialog with freeSolo brand/model + nozzle presets + image preview, detail page with maintenance table, "Impresoras" nav)
- `implementer` implemented `generate_budget` R11: printer select in budget form, params/defaults snapshot on create, per-field fallback, foreign/nonexistent printer → 404, PUT re-snapshot path, stale `final_price` fix via `CALC_AFFECTING_FIELDS` gate + regression tests
- `reviewer` APPROVED both: `progress/review_printer_profiles.md`, `progress/review_budget_r11.md` (R11 had 1 rejection → fixed: missing PUT tests + stale `final_price` bug, re-reviewed APPROVED). Non-blocking notes: nozzle "NaN"/"Infinity" → 500/accepts-invalid; brand/model >100 chars → DB 500 instead of clean 422 (left for future hardening)
- 147/147 tests pass, `pnpm build` clean, coverage > 70% on touched files; all tasks `[x]` in both task lists
- Commit subject: `feat: printer_profiles + generate_budget R11 (printer select)` — entered before commit per archive-first rule

Output: `printer_profiles` marked `done` in `feature_list.json`.

## Session 13 — 2026-08-04

**Feature:** `printer_profiles` review hardening + process rule (review docs)
**Transition:** follow-up work → committed; review markdowns eliminated

- Implemented both recommended changes from the printer review: non-finite nozzle sizes (`NaN`/`Infinity`/`-Infinity`) → 422 via `value.is_finite()` (`printer_service.py`); `brand`/`model` >100 chars → 422 in `PrinterCreate`/`PrinterUpdate` (`schemas/printer.py`). 4 new tests → **151/151 pass**, `printer_service.py` 95%, `schemas/printer.py` 93%
- New rule (docs): `progress/review_<feature>.md` is created only when the review produced recommended changes; clean approvals are recorded as an inline `## Reviewer verdict` in the impl file. Updated `reviewer.md`, `leader.md`, `CHECKPOINTS.md`, `docs/specs.md`
- Eliminated all `progress/review_*.md` (`printer_profiles`, `budget_r11`, `product_management`); verdicts migrated inline into the three impl files
- Fixed `init.sh` harness: `cancelled` features no longer require spec files
- Commits: printer hardening fix, review-doc rule + cleanup, init.sh fix

Output: repo clean of review markdowns; new rule in effect from this session.

## Session 14 — 2026-08-08

**Feature:** `dashboard` (impl, committed now) + landing redesign + `app_entry` spec
**Transition:** dashboard impl → committed (awaiting review + manual pass); `app_entry` → `spec_ready`

- Committed the `dashboard` implementation (was uncommitted in the working tree): backend overview API (`dashboard_service`, low-stock counts), tenant branding (`logo_url` + storage), supply movements (migration `015`, list/movement endpoints, `016` quantity nullable), migration `014_add_user_branding`, dashboard pages + profile, MUI v7 + Tailwind v4 system setup (`@mui/material-nextjs`, `@tailwindcss/postcss`, `globals.css`, theme rewrite), dashboard frontend (orders/stock/products/printers lists, orders table, LayerBarChart, auth + providers rework), 2 dashboard test suites + budget factory
- Landing redesign (this session): `/` rebuilt on the Boneyard DNA (Split Diptych: hero + launcher panel + steps + feature rows), pure black/white replaced with gray-900/gray-50 tokens, IBM Plex Mono → Overpass Mono, zero arbitrary Tailwind values, Hallmark stamp + `.hallmark/log.json`
- `app_entry` feature spec written by `spec_author` (R1–R7): `/` simplified to a non-selling entry point, `FlayerLogo` component with theme tokens, dashboard Logotype fallback; frontend-only (full-stack exception documented)
- Added agent skills: `hallmark`, `material-ui-nextjs`, `material-ui-tailwind` (skills-lock.json updated)

Output: commits made per logical group; `app_entry` waiting for human approval.

## Session 15 — 2026-08-10

**Feature:** `dashboard` (human manual pass)
**Transition:** `in_progress` → `done`

- Human completed the dashboard manual pass (UI/branding checks) themselves and marked the feature `done` in `feature_list.json`
- Manual verification checklist checked in `progress/impl_dashboard.md`
- Both deps (`stock_management`, `generate_budget`) done → `reports` now unblocked; `app_entry` still awaiting human approval

Output: dashboard done; repo clean.
