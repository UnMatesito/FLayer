# Tasks — dashboard

## Backend

### Schemas & models

- [x] `schemas/dashboard.py`: Pydantic response models `KpisResponse`, `ActivityPoint`, `RecentOrderItem`, `LowStockFilament`/`LowStockSupply` (reuse shape of `schemas/stock.py`), `PrinterBayItem`, `DashboardSummaryResponse` (R2–R8)
- [x] `services/dashboard_service.py`: `dashboard_service.build_summary(db, user_id) -> ...` implementing the batched query plan (latest-budget `DISTINCT ON` subquery, month KPI group, 14-day activity with zero-fill, recent 5 with customer join, low-stock, printer bay) — all tenant-scoped, no N+1 (R2–R8)
- [x] Final-value sketch as one helper (`_final_value(...)` = `COALESCE(latest budget final_price, orders.total, 0)`) reused by all revenue fields (R4, R5, R6)

### Endpoint

- [x] `api/dashboard.py`: `GET /api/dashboard/summary` with `get_current_user` dependency, returns `DashboardSummaryResponse` (R1–R8)
- [x] Register `dashboard_router` in `main.py` (R1–R8)

## Tests (`src/tests/integration/test_dashboard.py`)

- [x] `tests/factories/budget_factory.py`: `BudgetFactory` (order_id, user_id, version, final_price, margin_type, error_margin_percent, margin_multiplier) — avoids per-test budget API boilerplate (R4, R5, R6)
- [x] `test_summary_requires_auth` — no session → 401 (R1)
- [x] `test_summary_kpis_computed` — orders/budgets/filaments/supplies/printers + maintenance set up; asserts every `kpis` field (R2)
- [x] `test_summary_tenant_isolation` — second user's full data set; asserts zero leakage across all sections (R3)
- [x] `test_revenue_budget_overrides_total` — budget 1000 + total 200 + neither + cancelled-with-budget → `revenue_month` 1200 (R4)
- [x] `test_revenue_null_contributes_zero` — order with no budget and no total counts 0 (R4)
- [x] `test_activity_exactly_14_entries_zero_filled` — sparse orders + missing days → 14 entries, ends today, zero days present (R5)
- [x] `test_activity_excludes_cancelled` — cancelled order on a populated day excluded from count and revenue (R5)
- [x] `test_recent_orders_within_months_persisted` — 7 non-cancelled + 2 recent cancelled → returns exactly the 5 most recent, desc, cancelled absent, fields present, `short_id` = 8 chars (R6)
- [x] `test_recent_orders_from_all_statuses_with_final_value` — quoting order with budget reports `final_value` from the budget; order with only `total` and one with neither (R6 — extra)
- [x] `test_low_stock_lists_and_empty` — filament below threshold + supply below threshold listed; healthy items absent; empty arrays when none low (R7)
- [x] `test_printer_bay_active_only_with_maintenance` — active printers + monthly maintenance counted, archived printer excluded from `printers` and `maintenance_month` (R8)
- [x] `test_summary_month_boundary` — order created last UTC month excluded from `orders_month`/`revenue_month`, order this month included (R2 — extra)

## Frontend

### Theme & API client

- [x] `theme.ts`: add named palette tokens (`plate`, `snow`, `ink`, `slate`, `line`, `ember`) via module augmentation; `borderRadius` 6; type roles mapping the three faces (R9)
- [x] `layout.tsx`: load `Space Grotesk`, `Inter`, `IBM Plex Mono` via `next/font/google` (R9)
- [x] `api.ts`: `DashboardSummary` + nested types; `fetchDashboardSummary()`; reuse `LowStockFilament`/`LowStockSupply` types (R9)

### Signature chart

- [x] `components/LayerBarChart.tsx`: SVG chart of 14 day-bars drawn as stacked layer lines; today's bar consumes `theme.palette.primary.main` (user accent, `ember` default — no hardcoded hex); mono axis + "hoy" marker; one-time draw on mount, respects `prefers-reduced-motion`; empty-week state handled by parent (R9, R21)

### Home page (`src/app/dashboard/page.tsx` rewrite)

- [x] Header: `Vista general` (Space Grotesk) + mono date + generated status sentence from KPIs ("N impresiones en curso · M filamentos por reponer") (R9)
- [x] Greeting uses the Maker's `name` from the auth context (e.g. "Buen día, Ana") (R20)
- [x] Four-cell KPI row: Pedidos del mes, Ingresos del mes (mono, locale-formatted "$"), En cola (+ printing sub-line), Stock bajo (fil/insumos split) — mono numerals, uppercase tracked labels, hairline separators, no icons (R9)
- [x] Left column "En el taller": recent-orders queue from `recent_orders`; rows click → `/dashboard/orders/{id}`; "+ Nuevo pedido" quick action → `/dashboard/orders` (R9, R10)
- [x] Right column "Atención": low-stock panel (from `low_stock`, "Ir a stock" link) + printer bay (from `printers`, "Ir a impresoras" link) (R9)
- [x] Data via `useQuery(['dashboard-summary'], fetchDashboardSummary, { refetchInterval: 60_000 })`; `Skeleton` loading; error state with "Reintentar"; empty-tenant state "La semana está en blanco — creá tu primer pedido." + "Crear pedido" CTA (R9)
- [x] Responsive: KPI row 4-col → 2×2 on mobile; columns stack; chart scales to any width (R9)

### Orders hub (R10)

- [x] New `src/app/dashboard/orders/page.tsx`: hosts `StoreLink` (compact slot), `InternalOrderForm`, and `OrdersTable` (moved unchanged from the old home page) (R10)
- [x] Remove `StoreLink`, `InternalOrderForm`, `OrdersTable`, and logout button from the old home page (now the overview rewrite) (R9, R10)
- [x] `layout.tsx`: add "Pedidos" nav item (section "General", icon `ReceiptLong`) (R10)
- [x] Verify `/dashboard/orders/{id}` detail still reachable from the table rows and the hub does not break existing order flows (R10)

## Verification

- [x] Backend: `pytest tests/ -q` green with the new files; coverage of `api/dashboard.py` + `services/dashboard_service.py` + branding endpoints > 70% (R1–R8, R11–R19, R23)
- [ ] Frontend: `npm run build` and `npm run lint` clean (R9, R10, R20–R22)
- [ ] Manual (record in `progress/impl_dashboard.md`): login → home shows chart + KPIs from real data; low stock appears from seeded fixtures; orders hub reached via quick action; sidebar "Pedidos" highlights; mobile viewport renders stacked layout; reduced-motion shows static chart (R9, R10)
- [ ] Manual branding (record in `progress/impl_dashboard.md`): set a color → theme + chart "today" bar + nav selected change instantly; upload a logo → replaces "Flayer" in sidebar AND AppBar; remove logo → wordmark returns; Maker name appears in the home greeting (not the nav); invalid hex/file shows inline error; `curl` the three branding endpoints without a session → 401 (R11, R20–R22)

## Branding — backend (user personalization)

- [x] Migration `014_add_user_branding.py`: `users.primary_color` VARCHAR(7) nullable + hex CHECK, `users.logo_path` VARCHAR(500) nullable; run `alembic upgrade head` (dev `create_all` does NOT alter existing tables — required, else 500s) (R12–R18)
- [x] `schemas/auth.py`: extend `UserResponse` with `primary_color: str | None` and `logo_url: str | None` (computed in router/service via `get_file_url`, never raw `logo_path`); `RegisterRequest` + optional `primary_color` (same validator, omitted → null); new `ProfileUpdate` (name + primary_color, both optional); hex `field_validator` (`#RRGGBB`, normalized uppercase) (R12–R15, R19)
- [x] `RegisterResponse` gains `primary_color` for symmetry (R15)
- [x] `PATCH /api/auth/me` — verified session; trims non-empty name ≤ 255, sets `primary_color` (null clears); unknown fields → 422; returns updated `UserResponse` (R12, R13, R14, R23)
- [x] `POST /api/auth/me/logo` — verified session; multipart `file` via `storage_service.validate_image` + save as `uploads/logo_<user_id><ext>`; delete the previous logo file on replace; 422 on invalid type/size with previous logo intact; returns `UserResponse` (R16, R17)
- [x] `DELETE /api/auth/me/logo` — verified session; clears `logo_path`, deletes the file from disk; returns `UserResponse` with `logo_url: null` (R18)
- [x] `GET /api/auth/me` returns the extended `UserResponse` (R19)

## Branding — tests (`src/tests/integration/test_dashboard_branding.py`)

- [x] `test_patch_me_requires_auth` / `test_logo_upload_requires_auth` / `test_logo_delete_requires_auth` — no session → 401, nothing changed (R11)
- [x] `test_patch_updates_name_and_color` — both fields persisted, response reflects them (R12)
- [x] `test_patch_omitted_fields_unchanged` — only provided fields change (R12)
- [x] `test_patch_empty_name_422` (R12)
- [x] `test_patch_invalid_hex_422` — `#12`, `123456`, `#GGGGGG`, empty string → 422, stored value unchanged (R13)
- [x] `test_patch_clears_color_with_null` — `primary_color: null` → stored null, `/me` returns null (R14)
- [x] `test_register_with_optional_color` — valid hex stored + returned (R15)
- [x] `test_register_omitted_color_null` (R15)
- [x] `test_register_invalid_color_422` — no user created (R15)
- [x] `test_me_returns_branding_fields` — `primary_color` + `logo_url` present; `logo_url` null without logo; raw `logo_path` absent (R19)
- [x] `test_logo_upload_sets_url` — jpeg/png/webp ≤ 10MB accepted, file on disk, `logo_url` served, second upload replaces (R16)
- [x] `test_logo_upload_invalid_type_422` / `test_logo_upload_too_large_422` — nothing saved, previous logo intact (R17)
- [x] `test_logo_delete` — path cleared, file removed, `logo_url: null` (R18)
- [x] `test_no_cross_user_profile_access` — user B's branding never returned to user A; PATCH with an unknown `user_id` body field → 422 (R23)

## Branding — frontend

- [x] `api.ts`: extend `User` with `primary_color: string | null` and `logo_url: string | null`; add `ProfileUpdate`, `updateProfile`, `uploadLogo`, `removeLogo` (multipart) (R19, R20, R22)
- [x] `auth-context.tsx`: add `refreshUser()` to the context (refetch `/me`, `setUser`) (R19, R21)
- [x] `theme.ts` → `buildTheme(accent: string | null)` factory: tokens + fonts + `primary.main = accent ?? ember` (R21)
- [x] `providers.tsx`: reorder to `QueryClientProvider → AuthProvider → ThemedApp`; `ThemedApp` `useMemo`s `createTheme(buildTheme(user?.primary_color))` inside `ThemeProvider` (R21)
- [x] `layout.tsx` nav header + AppBar toolbar: render `<img>` logotype from `logo_url` (≈ 28px height, `objectFit: contain`) replacing the "Flayer" text; fallback to the wordmark when `logo_url` null (R20); the Maker's `name` is shown only in the home greeting, never in the nav
- [x] New `/dashboard/profile/page.tsx`: name field, color picker (native `<input type="color">` + `#RRGGBB` text, inline invalid-hex error), logo upload (client pre-check jpeg/png/webp ≤ 10MB), "Quitar logo", inline 422-mirror errors; every save calls `refreshUser()` (R22)
- [x] `layout.tsx`: add "Mi perfil" entry near "Cerrar sesión" → `/dashboard/profile` (R22)

Estimated total: ~26h (backend + tests ~15h, frontend ~11h) — original scope + branding (~8h)