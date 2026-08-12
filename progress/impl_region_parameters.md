# Impl record — region_parameters

**Feature:** `region_parameters` — DONE (approved 2026-08-12, marked `done` in `feature_list.json`)
**Spec:** `specs/region_parameters/{requirements,design,tasks}.md` (spec_ready → approved by human 2026-08-10)

## Human request (post-approval): six currencies + default-currency UX

- New currencies `EUR`, `BRL`, `GBP`, `MXN` with per-currency seed defaults:
  electricity price EUR 0.25 / BRL 0.80 / GBP 0.25 / MXN 2.50 (margins and
  error margin identical to the existing seeds: 5.00 / 3.00 / 4.00 / 5.00)
- Machine defaults for the new currencies: 120 W, lifespan 5000h, cost
  EUR 400 / BRL 2200 / GBP 320 / MXN 8000
- Migration `018` (`src/alembic/versions/018_add_currencies.py`): widens
  `ck_budget_parameters_currency` and `ck_users_currency` to the six
  currencies (the same checks in the SQLAlchemy models were widened too —
  tests create tables from the models)
- `Currency` Literal + `ALL_CURRENCIES` tuple in `schemas/auth.py`; the GET
  bundle iterates `ALL_CURRENCIES`, PUT path validated via `Currency`
- `VALID_CURRENCIES` in `schemas/budget.py` derives from `ALL_CURRENCIES`
  (validators unchanged otherwise)
- Frontend: `Currency` = six values, `CURRENCY_OPTIONS` + `currencySymbol` +
  `MACHINE_DEFAULT_FALLBACKS` in `api.ts`; profile block builds all six
  currencies, toggle/menu list all six; BudgetForm selector lists all six;
  BudgetBreakdown uses the shared symbol + fallback maps
- **UX**: the "Parámetros del Maker" block now points at the default
  currency — on load it shows `user.currency`, saving a new default switches
  the visible parameters to it (toggle stays free), and a line states when the
  visible currency is the default
- Tests: `test_get_parameters_seeded_defaults` → 6 rows + new-currency seeds;
  invalid-currency tests use `JPY`; new `test_patch_me_new_currency_accepted`
  (EUR) and `test_budget_new_currency_uses_seeded_parameters` (MXN budget →
  MXN seeds + machine defaults, electricity 0.60 / amortization 3.20)

**Result:** 201 passed (was 199), `tsc --noEmit` clean, `pnpm build` clean

## Backend (done)

- **Migration `017`** (`src/alembic/versions/017_region_parameters.py`): creates `budget_parameters` (5 params, `is_default`, checks `ck_budget_parameters_*`, `UNIQUE (user_id, currency)`, FK → users), adds `users.currency` VARCHAR(3) NOT NULL DEFAULT 'ARS' + `ck_users_currency`, adds nullable `budgets.electricity_price_kwh`
- **Models**: `BudgetParameters` (new, `src/backend/models/budget_parameters.py`), `User.currency`, `Budget.electricity_price_kwh`; exported in `models/__init__.py`
- **Schemas**: `BudgetParametersUpdate` (ranges per R5), `BudgetParametersResponse`, `BudgetParametersBundle` (`schemas/budget.py`); `UserResponse.currency` + `ProfileUpdate.currency` (`schemas/auth.py`); `BudgetCreate`/`BudgetPreviewRequest.currency` → `str | None = None`
- **Service** (`budget_service.py`): `get_budget_parameters` (seed-on-first-access, always DB-backed), `HARDCODED_DEFAULTS_*` deleted → `SEED_PARAMETERS_{ARS,USD}` (5 configurable keys, row-creation seed only) + `MACHINE_DEFAULTS_{ARS,USD}` (used only by `resolve_machine_params`); `calculate_breakdown`/`calculate_create`/`calculate_preview` now take `electricity_price_kwh`, `error_margin_percent`, `margin_multipliers` dict + machine params as required (no None→fallback)
- **Endpoints** (`api/budget.py`): `GET /api/budget-parameters` (both currencies, seed-or-return + `is_default`), `PUT /api/budget-parameters/{currency}` (Literal currency → 422 auto, full upsert, `is_default` → FALSE); budget create/update/preview resolve `currency None → current_user.currency`, load params, snapshot `electricity_price_kwh`; `_build_budget_response` (now async) recomputes read-time from snapshots (NULL electricity → seeded value; machine NULL → `resolve_machine_params(None, currency)`)
- **Auth** (`api/auth.py`): `_user_response` + `update_me` handle `currency`; `login` uses `_user_response`
- **Tests**: `tests/integration/test_budget_parameters.py` — 18 tests (R1–R14: seeded defaults, saved-row-wins, upsert create/update, R5/R6 422s, tenant isolation, budget integration ×5, snapshot immutability, user currency default/explicit, me/patch currency)
- Existing test updated: `test_dashboard_branding.py` `/me` key-set now includes `currency`

## Frontend (done)

- `api.ts`: `Currency` type, `User.currency`, `ProfileUpdate.currency`, `BudgetParameters`/`BudgetParametersBundle`/`BudgetParametersUpdate` types, `fetchBudgetParameters`, `updateBudgetParameters`, `updateUserCurrency`; `BudgetCreate.currency` → `'ARS' | 'USD' | null`
- `/dashboard/profile` (`src/frontend/src/app/dashboard/profile/page.tsx`): new `MakerParametersBlock` — "Moneda por defecto" selector (initialized from `useAuth().user`, save → `updateUserCurrency`), ARS/USD `ToggleButtonGroup`, 5 fields prefilled from one `fetchBudgetParameters` call, "Guardar" → `updateBudgetParameters`, `is_default` star hint ("Estás usando los valores por defecto"), frontend validation mirroring R5, success/error Snackbar; existing blocks (Nombre, Color de acento, Logotipo) untouched
- `BudgetForm.tsx`: currency preselected to `user?.currency ?? 'ARS'` (R17)

## Docs

- `docs/data_model.md`: relationship diagram fixed (`budget_parameters` now under `users`), budget formula section documents the configurable params source, `users.currency`, and the `budgets.electricity_price_kwh` snapshot

## Files modified

- `src/alembic/versions/017_region_parameters.py` (NEW)
- `src/backend/models/budget_parameters.py` (NEW)
- `src/backend/models/user.py`, `src/backend/models/budget.py`, `src/backend/models/__init__.py`
- `src/backend/schemas/budget.py`, `src/backend/schemas/auth.py`
- `src/backend/services/budget_service.py`
- `src/backend/api/budget.py`, `src/backend/api/auth.py`
- `src/tests/integration/test_budget_parameters.py` (NEW), `src/tests/integration/test_dashboard_branding.py`
- `src/frontend/src/app/api.ts`, `src/frontend/src/app/dashboard/profile/page.tsx`, `src/frontend/src/components/BudgetForm.tsx`
- `docs/data_model.md`

## Traceability R<n> → test

- R1 ← test_get_parameters_seeded_defaults
- R2 ← test_get_parameters_saved_row_wins
- R3 ← test_put_parameters_creates_row
- R4 ← test_put_parameters_updates_row
- R5 ← test_put_parameters_missing_field_422, test_put_parameters_zero_or_negative_422, test_put_parameters_out_of_range_422
- R6 ← test_put_parameters_invalid_currency_422
- R7 ← test_parameters_tenant_isolation
- R8 ← test_budget_uses_configured_parameters
- R9 ← test_budget_uses_seeded_values_when_unconfigured
- R10 ← test_budget_snapshot_immutable
- R11 ← test_budget_currency_defaults_to_user_currency
- R12 ← test_budget_explicit_currency_respected
- R13 ← test_get_me_includes_currency (+ test_me_returns_branding_fields updated)
- R14 ← test_patch_me_currency, test_patch_me_invalid_currency_422, test_patch_me_unknown_field_still_rejected
- R15 ← test_get_parameters_seeded_defaults (prefill), test_get_parameters_saved_row_wins (hint)
- R16 ← test_patch_me_currency
- R17 ← test_budget_currency_defaults_to_user_currency

## Manual verification

- [x] `pytest` → **199 passed** (was 181); touched-file coverage: api/budget.py 96%, budget_service.py 92%, api/auth.py 97%
- [x] Frontend `tsc --noEmit` clean
- [x] Frontend `pnpm build` clean (all routes, incl. `/dashboard/profile`)
- [x] Perfil sidebar entry already present (dashboard) — navigates to `/dashboard/profile`
- [ ] Browser pass: profile block saves params, toggles ARS/USD, default-currency selector updates budget form preselect (human)

## Verification notes

- Test DB: `src/docker-compose.yml` up (`flayer-db-test` on :5433) — needed for pytest
- `get_budget_parameters` commits the seed row on first access (by design — lazy seeding, idempotent)

## Reviewer verdict
APPROVED — no recommended changes, no review doc created (2026-08-12)
