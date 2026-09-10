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

## Session 16 — 2026-08-12

**Feature:** `region_parameters` (+ ongoing UX work)
**Transition:** `spec_ready` → `done`

- Implemented (uncommitted, awaiting split into commits): 6 currencies (EUR/BRL/GBP/MXN per-currency seeds, migration `017` budget_parameters + `018` currencies), `users.currency` + budget parameter upserts, profile block "Parámetros del Maker", BudgetForm preselect, docs/data_model update
- Reviewer (agent) full traceability R1–R17: 203 passed, coverage api/budget.py 96% / budget_service.py 93% / api/auth.py 97%, tsc clean → verdict APPROVED inline in `progress/impl_region_parameters.md` (no review doc per rule)
- Also this session (UI polish, not SDD-tracked): shared `Pagination` component (10/50/100, defaults: orders 10, rest 50) applied to orders/filaments/supplies/movements; orders + profile pages 2-column layouts; profile "Información del Maker" card; business_name on User (migration `019`) + browser tab title "Business Name — Flayer"; orders page design pass (card header w/ live count, empty-state invite, outlined type chips)
- Fixed duplicated `usePagination` hooks-order violation in FilamentsPage (hook after early return)

Output: `region_parameters` marked `done` in `feature_list.json`; `current.md` updated.

## Session 17 — 2026-08-12

**Feature:** `brand_identity` (manual pass) + `create_order` R7 (hardening)
**Transition:** brand_identity `in_progress` → `done`; create_order `spec_ready` → `done`

- brand_identity manual pass completed:
  - Hero restructured: full-width `bg-plate` section, nozzle SVG (evenodd cutout), rounded bar, responsive `sm`/`lg`
  - FlayerLogo component + SVG assets (iso_black, iso_white, logo)
  - Dashboard layout: Logotype in sidebar + app bar
  - Logo cache-bust fix: `storage_service.py` `get_file_url` appends `?v={mtime}`
  - Manual entries updated: removed "Panel del taller", added "Pedidos" + "Productos"
  - Cleaned up unused CSS animations (print-line-strip, nozzle-fade)
- create_order R7 store-token hardening implemented:
  - `public_store.py`: `token=None` → 404 "Invalid store token" (removed `ANONYMOUS_USER_ID`)
  - `orders.py`: removed anonymous user fabrication (user not found → 404)
  - `StoreTokenFactory` created, 4 new 404 tests (missing/unknown token for orders + products)
  - Fixed 3 logo URL assertions for cache-bust param
  - 207/207 tests pass
- Specs updated: brand_identity (renamed from app_entry), create_order R7 tasks marked done, dash_enhancement new spec

Output: both features marked `done` in `feature_list.json`; ready to commit.

## Session 18 — 2026-09-09

**Feature:** `generate_budget` (R12–R15 margin/post-processing revision) + `create_order` (R8–R24 revision approval)
**Transition:** `generate_budget` `in_progress` → `done`; `create_order` `spec_ready` (approved, awaiting pipeline)

- generate_budget review rejected (first pass): R11 missing from R→test traceability map; R13–R15 frontend requirement clauses had no automated tests (no frontend test harness existed)
- Implementer follow-up fixed all findings: added R11 traceability entries; added minimal Vitest + Testing Library harness (`vitest.config.ts`, `vitest.setup.ts`, deps in `package.json`, `pnpm test`) and component tests for BudgetForm (R13 preset buttons ↔ numeric margin input + custom `6` behavior; R14 post-processing toggle-off zero submit; R15 no ML price line) and BudgetBreakdown (R15)
- Re-review APPROVED 2026-09-09: 214 backend tests passed (88% coverage), `pnpm test` 5 passed, tsc clean, build clean; fresh inline `## Reviewer verdict` appended to `progress/impl_generate_budget.md`; rejection record retained in `progress/review_generate_budget.md`
- create_order spec revision (R8–R24) prepared and amended (delivery-cost = `embalaje` + `Precio Envio` only; `3d printing` defaults selected for `print`); human APPROVED

Output: `generate_budget` marked `done`; `create_order` advanced to `in_progress` (implementation).

## Session 19 — 2026-09-09

**Feature:** `create_order` (R8-R24 revision)
**Transition:** `in_progress` → `done`

- Implemented approved R8-R24 revision via implementer (TDD, task by task):
  - Backend: migration `021_add_order_intake_fields` (7 columns + backfill + check constraints, no `peso`), model/schema validators (category, min one print service, product forces services false, delivery type), `PATCH /api/orders/{id}/delivery-cost` (401/404/409/422), `GET /api/orders/{id}` returns new fields
  - Frontend: `OrderForm.tsx` category-first rewrite (`print`/`product`, `3d printing` default-selected, dimensions helper text, delivery selector), internal form mirrored, `DeliveryCostDialog` (embalaje + Precio Envio only), order detail shows `Agregar costo de Entrega` only for `Delivery` orders; Vitest tests (OrderForm, DeliveryCostDialog, order detail page)
  - Tests: backend 230 passed, frontend 22 passed; coverage orders.py 74%/model 100%/schemas 98%; tsc clean, build clean, ruff clean
- Reviewer rejected once (R18/R19 button visibility untested) → fixed with `dashboard/orders/[id]/page.test.tsx` → re-review APPROVED 2026-09-09 (inline verdict in `progress/impl_create_order.md`; rejection record in `progress/review_create_order.md`)
- Human completed manual Layer-3 verification (migration `021` upgrade + delivery-cost endpoint behavior + form/detail flow) → feature closed

Output: `create_order` marked `done` in `feature_list.json`.

## Session 20 — 2026-09-09

**Feature:** `order_status` (budget-gate revision) + feature list additions
**Transition:** no feature status change (order_status remains `done`)

- order_status revision: `quoting → printing` now rejected with 409 when the order has no generated budget (R8/R9 in `specs/order_status`); guard runs before filament lookup/stock deduction; order detail disables "Iniciar impresión" until a budget exists
- Tests: no-budget rejection, budget-present transition, stock printing tests updated with budget fixtures
- Feature list: added `multi_language` (pending; depends on authentication, dashboard) and `export_final_budget` (pending; depends on generate_budget)

Output: all work committed (generate_budget + region_parameters revision, order_status budget gate, create_order R8-R24, meta/feature-list).
