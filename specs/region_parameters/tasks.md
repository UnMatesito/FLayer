# Tasks — region_parameters

## Backend

### Database & Models

- [x] Migration `017`: create `budget_parameters` (5 params + `is_default` BOOLEAN NOT NULL DEFAULT TRUE + checks `ck_budget_parameters_*`, `UNIQUE (user_id, currency)`, FK → users) (R1–R7)
- [x] Migration `018`: widen `ck_budget_parameters_currency` and `ck_users_currency` to the six currencies (EUR, BRL, GBP, MXN) + same checks in the models (human request, post-review)
- [x] Migration `017`: `users.currency` VARCHAR(3) NOT NULL DEFAULT 'ARS' + currency check (R11, R13, R14)
- [x] Migration `017`: `budgets.electricity_price_kwh` DECIMAL(12,2) nullable snapshot (R8, R10)
- [x] SQLAlchemy model `BudgetParameters` (+ `is_default`) + `User.currency` + `Budget.electricity_price_kwh` (R1–R10, R13)
- [x] Pydantic schemas: `BudgetParametersUpdate` (5 fields, ranges per R5), `BudgetParametersResponse` (+ `is_default`), `BudgetParametersBundle` (R1–R5)
- [x] Pydantic: `UserResponse.currency`; `UserUpdate` with `currency` Literal (R13, R14)

### Service — `budget_service.py`

- [x] `get_budget_parameters(db, user_id, currency)` — async lookup; when no row exists, INSERT it with the seed values + `is_default = TRUE`; always returns a DB-backed row (R1, R8, R9)
- [x] Seed constants for all six currencies (`SEED_PARAMETERS_{ARS,USD,EUR,BRL,GBP,MXN}` + `MACHINE_DEFAULTS_*`); `ALL_CURRENCIES` tuple in `schemas/auth.py` drives the GET bundle and PUT validation (human request)
- [x] DELETE `HARDCODED_DEFAULTS_{ARS,USD}` from the calculation path — replace with a seed-only constant used at row creation; move the machine defaults (`machine_wattage`, `machine_cost`, `machine_lifespan_hours`) to `MACHINE_DEFAULTS_{ARS,USD}` used only by `resolve_machine_params` (R9)
- [x] `calculate_breakdown` required params: `electricity_price_kwh`, `error_margin_percent`, `margin_multipliers` dict — no `None` fallback (R8, R9, R10)
- [x] Thread the same required kwargs through `calculate_create` and `calculate_preview`; update existing callers and unit tests to pass resolved values (R8, R9)

### Endpoints

- [x] `GET /api/budget-parameters` — all six currencies, seed-or-return + `is_default`, scoped to current user (R1, R2, R7)
- [x] `PUT /api/budget-parameters/{currency}` — upsert with Literal currency + full validation (R3, R4, R5, R6, R7)
- [x] Extend existing `PATCH /api/auth/me` (created by `dashboard`): add `currency` to `ProfileUpdate` (Literal, `extra = "forbid"` kept), one `if "currency" in data:` branch in `update_me`; 422 on invalid value; `GET /api/auth/me` returns `currency` via `UserResponse` (R13, R14)

### Budget integration

- [x] `BudgetCreate` / `BudgetPreviewRequest`: `currency: str | None = None` (R11, R12)
- [x] Budget create/preview routes: resolve `None → current_user.currency`; update route keeps `None = unchanged` (uses the budget's existing currency); load `get_budget_parameters`, pass values into calculator (R8, R9, R11, R12)
- [x] Snapshot `budgets.electricity_price_kwh` at save; read-time recompute uses snapshotted `electricity_price_kwh` / `error_margin_percent` / `margin_multiplier`; `NULL` snapshot → seeded value for `(user, currency)` (R8, R10)

## Tests (`src/tests/integration/test_budget_parameters.py`)

- [x] `test_get_parameters_seeded_defaults` — first GET seeds rows for both currencies with the pre-feature values, `is_default: true` (R1, R15 — page prefill)
- [x] `test_get_parameters_saved_row_wins` — customized ARS row → `is_default: false`, USD still seeded with `is_default: true` (R2, R15)
- [x] `test_put_parameters_creates_row` — upsert creates + persists + subsequent GET returns it, `is_default: false` (R3)
- [x] `test_put_parameters_updates_row` — same `id`, `created_at` kept, `updated_at` refreshed, `is_default` flipped to `false` (R4)
- [x] `test_put_parameters_missing_field_422` (R5)
- [x] `test_put_parameters_zero_or_negative_422` — electricity ≤ 0, multiplier ≤ 0 (R5)
- [x] `test_put_parameters_out_of_range_422` — electricity > 10000, error margin > 100, multiplier > 100 (R5)
- [x] `test_put_parameters_invalid_currency_422` — PUT only, `JPY` not in the six (R6)
- [x] `test_get_parameters_seeded_defaults` extended — 6 seeded rows; EUR/BRL/GBP/MXN seeds asserted (R1)
- [x] `test_patch_me_new_currency_accepted` — EUR accepted by PATCH /me (R14)
- [x] `test_budget_new_currency_uses_seeded_parameters` — MXN budget uses MXN seeds + machine defaults (R9, R12)
- [x] `test_parameters_tenant_isolation` — second user sees its own seeded rows, first user's rows untouched (R7)
- [x] `test_budget_uses_configured_parameters` — custom ARS row changes electricity/error margin/multiplier in the calculated budget + snapshots (R8)
- [x] `test_budget_uses_seeded_values_when_unconfigured` — result identical to pre-feature values (R9)
- [x] `test_budget_snapshot_immutable` — edit params after creation → existing budget response unchanged (R10)
- [x] `test_budget_currency_defaults_to_user_currency` — `currency` omitted → user's currency used (R11, R17 — form preselect)
- [x] `test_budget_explicit_currency_respected` — explicit USD overrides ARS default (R12)
- [x] `test_get_me_includes_currency` (R13)
- [x] `test_patch_me_currency` — updates and persists (R14, R16 — page selector)
- [x] `test_patch_me_invalid_currency_422` (R14)

## Frontend

- [x] `api.ts`: extend `User` with `currency`; add `Currency` (six values), `CURRENCY_OPTIONS`, `currencySymbol`, `MACHINE_DEFAULT_FALLBACKS`, `BudgetParameters`, `BudgetParametersBundle`, `BudgetParametersUpdate` types (R13, R15)
- [x] `api.ts`: `fetchBudgetParameters`, `updateBudgetParameters`, `updateUserCurrency` (R15, R16)
- [x] Extend the existing `/dashboard/profile` "Mi perfil" page (created by `dashboard`: Nombre, Color de acento, Logotipo blocks) with a "Parámetros del Maker" block: six-currency `ToggleButtonGroup`, five editable fields prefilled from `fetchBudgetParameters`, "Guardar" → `updateBudgetParameters`, `is_default` hint, frontend validation mirroring R5; existing blocks untouched (R15)
- [x] UX: the block points at the operator's default currency on load, switches to a newly saved default, and states when the visible currency is the default (human request)
- [x] Default currency selector in the new Perfil page block: initialized from `fetchMe`, save → `updateUserCurrency` (R16)
- [x] Verify the existing "Mi perfil" sidebar entry (bottom of the dashboard sidebar, `PersonOutlineIcon`, added by `dashboard`) still navigates to `/dashboard/profile`; no `navItems` change required (R15)
- [x] `BudgetForm.tsx` / `BudgetBreakdown.tsx`: currency selector with all six currencies preselected to the user's default; per-currency symbols and machine-default fallbacks via `currencySymbol` / `MACHINE_DEFAULT_FALLBACKS`; `BudgetCreate`/`BudgetPreviewRequest` payloads send `currency` only when changed (R17)

Estimated total: ~18h (backend 7h, tests 5h, frontend 4h, migration/model 2h)

## Revision tasks — 2026-09-09

- [x] Migration/model: drop `budget_parameters` margin multiplier columns and checks (R18)
- [x] Schemas/API/service: return and accept only electricity price plus error margin for budget parameters (R18, R19)
- [x] Frontend profile block: remove regional multiplier inputs and validation (R18)
- [x] Tests: seeded/default/update payloads no longer expose multipliers; budget calculation ignores regional margins and uses per-budget margin (R18, R19)
