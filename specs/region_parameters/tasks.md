# Tasks — region_parameters

## Backend

### Database & Models

- [ ] Migration `014`: create `budget_parameters` (5 params + `is_default` BOOLEAN NOT NULL DEFAULT TRUE + checks `ck_budget_parameters_*`, `UNIQUE (user_id, currency)`, FK → users) (R1–R7)
- [ ] Migration `014`: `users.currency` VARCHAR(3) NOT NULL DEFAULT 'ARS' + currency check (R11, R13, R14)
- [ ] Migration `014`: `budgets.electricity_price_kwh` DECIMAL(12,2) nullable snapshot (R8, R10)
- [ ] SQLAlchemy model `BudgetParameters` (+ `is_default`) + `User.currency` + `Budget.electricity_price_kwh` (R1–R10, R13)
- [ ] Pydantic schemas: `BudgetParametersUpdate` (5 fields, ranges per R5), `BudgetParametersResponse` (+ `is_default`), `BudgetParametersBundle` (R1–R5)
- [ ] Pydantic: `UserResponse.currency`; `UserUpdate` with `currency` Literal (R13, R14)

### Service — `budget_service.py`

- [ ] `get_budget_parameters(db, user_id, currency)` — async lookup; when no row exists, INSERT it with the seed values + `is_default = TRUE`; always returns a DB-backed row (R1, R8, R9)
- [ ] DELETE `HARDCODED_DEFAULTS_{ARS,USD}` from the calculation path — replace with a seed-only constant used at row creation; move the machine defaults (`machine_wattage`, `machine_cost`, `machine_lifespan_hours`) to `MACHINE_DEFAULTS_{ARS,USD}` used only by `resolve_machine_params` (R9)
- [ ] `calculate_breakdown` required params: `electricity_price_kwh`, `error_margin_percent`, `margin_multipliers` dict — no `None` fallback (R8, R9, R10)
- [ ] Thread the same required kwargs through `calculate_create` and `calculate_preview`; update existing callers and unit tests to pass resolved values (R8, R9)

### Endpoints

- [ ] `GET /api/budget-parameters` — both currencies, seed-or-return + `is_default`, scoped to current user (R1, R2, R7)
- [ ] `PUT /api/budget-parameters/{currency}` — upsert with Literal currency + full validation (R3, R4, R5, R6, R7)
- [ ] `PATCH /api/auth/me` — update `users.currency`; 422 on invalid value; `GET /api/auth/me` returns `currency` (R13, R14)

### Budget integration

- [ ] `BudgetCreate` / `BudgetPreviewRequest`: `currency: str | None = None` (R11, R12)
- [ ] Budget create/preview routes: resolve `None → current_user.currency`; update route keeps `None = unchanged` (uses the budget's existing currency); load `get_budget_parameters`, pass values into calculator (R8, R9, R11, R12)
- [ ] Snapshot `budgets.electricity_price_kwh` at save; read-time recompute uses snapshotted `electricity_price_kwh` / `error_margin_percent` / `margin_multiplier`; `NULL` snapshot → seeded value for `(user, currency)` (R8, R10)

## Tests (`src/tests/integration/test_budget_parameters.py`)

- [ ] `test_get_parameters_seeded_defaults` — first GET seeds rows for both currencies with the pre-feature values, `is_default: true` (R1, R15 — page prefill)
- [ ] `test_get_parameters_saved_row_wins` — customized ARS row → `is_default: false`, USD still seeded with `is_default: true` (R2, R15)
- [ ] `test_put_parameters_creates_row` — upsert creates + persists + subsequent GET returns it, `is_default: false` (R3)
- [ ] `test_put_parameters_updates_row` — same `id`, `created_at` kept, `updated_at` refreshed, `is_default` flipped to `false` (R4)
- [ ] `test_put_parameters_missing_field_422` (R5)
- [ ] `test_put_parameters_zero_or_negative_422` — electricity ≤ 0, multiplier ≤ 0 (R5)
- [ ] `test_put_parameters_out_of_range_422` — electricity > 10000, error margin > 100, multiplier > 100 (R5)
- [ ] `test_put_parameters_invalid_currency_422` — PUT only (R6)
- [ ] `test_parameters_tenant_isolation` — second user sees its own seeded rows, first user's rows untouched (R7)
- [ ] `test_budget_uses_configured_parameters` — custom ARS row changes electricity/error margin/multiplier in the calculated budget + snapshots (R8)
- [ ] `test_budget_uses_seeded_values_when_unconfigured` — result identical to pre-feature values (R9)
- [ ] `test_budget_snapshot_immutable` — edit params after creation → existing budget response unchanged (R10)
- [ ] `test_budget_currency_defaults_to_user_currency` — `currency` omitted → user's currency used (R11, R17 — form preselect)
- [ ] `test_budget_explicit_currency_respected` — explicit USD overrides ARS default (R12)
- [ ] `test_get_me_includes_currency` (R13)
- [ ] `test_patch_me_currency` — updates and persists (R14, R16 — page selector)
- [ ] `test_patch_me_invalid_currency_422` (R14)

## Frontend

- [ ] `api.ts`: extend `User` with `currency`; add `Currency`, `BudgetParameters`, `BudgetParametersBundle`, `BudgetParametersUpdate` types (R13, R15)
- [ ] `api.ts`: `fetchBudgetParameters`, `updateBudgetParameters`, `updateUserCurrency` (R15, R16)
- [ ] Create `/dashboard/profile` "Perfil" page with a single "Parámetros del Maker" block: ARS/USD `ToggleButtonGroup`, five editable fields prefilled from `fetchBudgetParameters`, "Guardar" → `updateBudgetParameters`, `is_default` hint, frontend validation mirroring R5; no other user data displayed or edited (R15)
- [ ] Default currency selector in the Perfil page block: initialized from `fetchMe`, save → `updateUserCurrency` (R16)
- [ ] Add "Perfil" nav item (`PersonIcon`, section "Configuración") to dashboard `navItems` (R15)
- [ ] `BudgetForm.tsx`: currency selector preselected to the user's default currency; `BudgetCreate`/`BudgetPreviewRequest` payloads send `currency` only when changed (R17)

Estimated total: ~18h (backend 7h, tests 5h, frontend 4h, migration/model 2h)
