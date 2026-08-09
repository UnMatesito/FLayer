# Implementation — dashboard

Working notes for the `dashboard` feature. TDD per task in `specs/dashboard/tasks.md`.

## Baseline

- Existing suite green (151 tests) before touching anything.
- DB: docker compose up (flayer postgres + flayer-db-test).
- Alembic head: `013`. Will add `014_add_user_branding`.

## Task log

_(filled in as tasks complete)_

### Backend — summary endpoint (all green)

- TDD per task: RED (12 tests) → `schemas/dashboard.py` → `services/dashboard_service.py` → `api/dashboard.py` + `main.py` → GREEN (181).
- `BudgetFactory` added (`tests/factories/budget_factory.py`) to avoid budget API boilerplate in tests.
- Migration `014_add_user_branding` created + applied (`alembic upgrade head` → `014 (head)`).

### Backend — branding (all green)

- Models: `users.primary_color` (VARCHAR(7), hex CHECK), `users.logo_path` (VARCHAR(500)).
- `PATCH /api/auth/me`, `POST /api/auth/me/logo`, `DELETE /api/auth/me/logo`; `GET /me` + register return extended `UserResponse` (logo_url derived via `storage_service.get_file_url`, raw `logo_path` never exposed).
- 18 tests in `test_dashboard_branding.py` (auth 401s, hex/name validation 422s, logo upload/replace/delete, tenant isolation).

### Frontend — theme, chart, home, orders hub, branding UI (build green)

- `theme.ts` → `buildTheme(accent)` factory + named tokens (plate/snow/ink/slate/line/ember) + `display`/`eyebrow`/`mono` typography variants; root `layout.tsx` loads Space Grotesk/Inter/IBM Plex Mono via `next/font`; `providers.tsx` → `QueryClientProvider → AuthProvider → ThemedApp`.
- `api.ts`: `User` + `primary_color`/`logo_url`, `ProfileUpdate`, `updateProfile`, `uploadLogo`, `removeLogo`, `DashboardSummary` + `fetchDashboardSummary`.
- `components/LayerBarChart.tsx`: hand-rolled SVG, 14 day-bars as stacked 4.5px layers, today bar + "hoy" marker in `theme.palette.primary.main`, ResizeObserver, `prefers-reduced-motion` respected (static draw).
- `app/dashboard/page.tsx` rewritten as the mission-control overview (header + mono date + status sentence from KPIs, 4-cell KPI row, "En el taller" queue, "Atención" panels, 60 s refetch, skeleton/error/empty states). Greeting uses Maker's `name` only here.
- `app/dashboard/orders/page.tsx` hub: `StoreLink` + `InternalOrderForm` + `OrdersTable` moved unchanged from old home; detail route `/dashboard/orders/{id}` still reached from table rows.
- `app/dashboard/layout.tsx`: logo `<img>` replaces "Flayer" in nav header AND AppBar (wordmark fallback), "Pedidos" (ReceiptLong) nav item, "Mi perfil" near "Cerrar sesión".
- `app/dashboard/profile/page.tsx`: name field, native color picker + `#RRGGBB` text with inline hex error, logo upload (client pre-check jpeg/png/webp ≤ 10 MB) + "Quitar logo", every save → `refreshUser()` (instant theme/greeting/nav updates).

## Files modified

Backend: `src/backend/models/user.py`, `src/backend/schemas/auth.py`, `src/backend/schemas/dashboard.py` (new), `src/backend/services/dashboard_service.py` (new), `src/backend/services/storage_service.py`, `src/backend/api/auth.py`, `src/backend/api/dashboard.py` (new), `src/backend/main.py`, `src/alembic/versions/014_add_user_branding.py` (new).
Tests: `src/tests/integration/test_dashboard.py` (new, 12), `src/tests/integration/test_dashboard_branding.py` (new, 18), `src/tests/factories/budget_factory.py` (new), `src/tests/factories/__init__.py`.
Frontend: `src/frontend/src/app/theme.ts`, `layout.tsx`, `providers.tsx`, `auth-context.tsx`, `api.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `dashboard/orders/page.tsx` (new), `dashboard/profile/page.tsx` (new), `src/frontend/src/components/LayerBarChart.tsx` (new).

## Traceability (R → test/file)

- R1 auth 401 → `test_summary_requires_auth`; R2 KPIs → `test_summary_kpis_computed` (+ `test_summary_month_boundary`); R3 isolation → `test_summary_tenant_isolation`; R4 revenue → `test_revenue_budget_overrides_total`, `test_revenue_null_contributes_zero`; R5 activity → `test_activity_exactly_14_entries_zero_filled`, `test_activity_excludes_cancelled`; R6 recent → `test_recent_orders_within_months_persisted`, `test_recent_orders_from_all_statuses_with_final_value`; R7 low stock → `test_low_stock_lists_and_empty`; R8 printer bay → `test_printer_bay_active_only_with_maintenance`.
- R11–R23 branding → `test_dashboard_branding.py` (18 tests) + frontend: `theme.ts`/`providers.tsx` (R21), `layout.tsx` logotype + "Mi perfil" (R20, R22), `profile/page.tsx` (R22), `auth-context.tsx` `refreshUser` (R19, R21), `api.ts` (R19, R20, R22).
- R9/R10 frontend → `LayerBarChart.tsx`, `dashboard/page.tsx`, `dashboard/orders/page.tsx`, `dashboard/layout.tsx`.

## Verification

- Backend: `poetry run pytest tests/ -q` → **181 passed** (baseline 151 + 30 new).
- Coverage (`--cov=api.dashboard --cov=services.dashboard_service --cov=api.auth --cov=schemas.auth`): TOTAL 98% — dashboard.py 100%, dashboard_service.py 100%, auth.py 97%, schemas/auth.py 96%.
- Ruff on new/changed files: clean. (Repo baseline has 25 pre-existing errors in untouched files — not addressed here.)
- Frontend: `pnpm build` → clean (14 routes, incl. new `/dashboard/orders`, `/dashboard/profile`).
- Frontend lint: **NOT runnable** — `package.json` lint script is `next lint`, removed in Next 16 (`Invalid project directory ... lint`). Pre-existing; not introduced by this feature. Recommend dropping the script or migrating to ESLint CLI.
- `./init.sh` re-run: green (script idempotent; migration 014 applied cleanly from scratch).

## Manual verification (pending — human or app run)

- [ ] Login → home shows chart + KPIs from real data; low stock appears from seeded fixtures; orders hub reached via quick action; sidebar "Pedidos" highlights; mobile viewport stacked; reduced-motion static chart.
- [ ] Branding: set color → theme + chart today-bar + nav selected change instantly; upload logo → replaces "Flayer" in sidebar AND AppBar; remove → wordmark returns; name appears in home greeting only; invalid hex/file → inline error; `curl` branding endpoints without session → 401.

## Deviations / notes

- `orders/page.tsx` shows StoreLink as a full-width card (kept component unchanged — no compact slot variant added; low risk, cosmetic).
- Greeting wording is "Buen día, {nombre} — {estado}" per design copy; empty-state copy: "La semana está en blanco — creá tu primer pedido."
- Chart "hoy" bar + "hoy" marker use `theme.palette.primary.main` (user accent, `ember` default); no hardcoded hex in the chart.

## Reviewer verdict
APPROVED — no recommended changes, no review doc created (2026-08-04)
