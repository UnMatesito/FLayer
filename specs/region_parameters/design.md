# Design — region_parameters

Feature name is `region_parameters`, table name is `budget_parameters`
(as already registered in `docs/data_model.md`).

## Tables (see `docs/data_model.md` for conventions)

### `budget_parameters` (new, created by this feature)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` | Multi-tenant |
| `currency` | VARCHAR(3) | NOT NULL, `CHECK (currency IN ('ARS','USD'))` | |
| `electricity_price_kwh` | DECIMAL(12,2) | NOT NULL, `CHECK (> 0)` | Price per kWh in the row's currency |
| `error_margin_percent` | DECIMAL(5,2) | NOT NULL, `CHECK (>= 0 AND <= 100)` | Calibration waste margin |
| `margin_multiplier_wholesale` | DECIMAL(5,2) | NOT NULL, `CHECK (> 0 AND <= 100)` | |
| `margin_multiplier_retail` | DECIMAL(5,2) | NOT NULL, `CHECK (> 0 AND <= 100)` | |
| `margin_multiplier_keychain` | DECIMAL(5,2) | NOT NULL, `CHECK (> 0 AND <= 100)` | |
| `is_default` | BOOLEAN | NOT NULL, `DEFAULT TRUE` | `TRUE` while the row holds the seeded values; flipped to `FALSE` by the first `PUT` |
| `created_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |

Constraints:
- `UNIQUE (user_id, currency)` — at most one row per tenant per currency
- Check constraints named `ck_budget_parameters_*` (see migration 014)
- **No soft-delete column** — see decision below

### `users` (extended by this feature)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `currency` | VARCHAR(3) | NOT NULL, `DEFAULT 'ARS'`, `CHECK (currency IN ('ARS','USD'))` | New column; existing rows backfilled to `ARS` by the server default |

### `budgets` (extended by this feature)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `electricity_price_kwh` | DECIMAL(12,2) | nullable | Snapshot of the price used at calc time; `NULL` = pre-feature budget → read falls back to the seeded value for `(user, currency)` (the pre-feature value is exactly what the seed stores) |

`error_margin_percent` and `margin_multiplier` are already snapshotted
NOT NULL columns on `budgets` — this feature only adds the missing
`electricity_price_kwh` snapshot. No backfill: for every pre-feature row the
price actually used was the pre-feature default, which is exactly what the
seeded `(user, currency)` value returns.

## Migrations (single Alembic migration `014`)

1. Create `budget_parameters` with the FK, unique constraint, and checks above.
2. `ALTER TABLE users ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'ARS'`
   (server default backfills existing rows) + currency check constraint.
3. `ALTER TABLE budgets ADD COLUMN electricity_price_kwh DECIMAL(12,2)`.

## Endpoints

All routes tenant-scoped via the existing `get_current_user` dependency
(same pattern as `printer_profiles`). No 404 exists on these routes — the
"read" semantics seed-or-return and the "write" semantics upsert.

| Method | Route | Auth | Usage |
|---|---|---|---|
| `GET` | `/api/budget-parameters` | Required | Read effective parameters for both currencies (R1, R2, R7) |
| `PUT` | `/api/budget-parameters/{currency}` | Required | Upsert one currency's parameters (R3–R7) |
| `PATCH` | `/api/auth/me` | Required | Update the user's default currency (R14) |
| `GET` | `/api/auth/me` | Required (extended) | User profile now includes `currency` (R13) |

### `GET /api/budget-parameters` — Response (200)

```json
{
  "parameters": {
    "ARS": {
      "currency": "ARS",
      "electricity_price_kwh": 140.00,
      "error_margin_percent": 5.00,
      "margin_multiplier_wholesale": 3.00,
      "margin_multiplier_retail": 4.00,
      "margin_multiplier_keychain": 5.00,
      "is_default": true
    },
    "USD": {
      "currency": "USD",
      "electricity_price_kwh": 0.15,
      "error_margin_percent": 5.00,
      "margin_multiplier_wholesale": 3.00,
      "margin_multiplier_retail": 4.00,
      "margin_multiplier_keychain": 5.00,
      "is_default": true
    }
  }
}
```

Both currencies are always present (seed-on-first-access guarantees it).
`is_default: true` means the row still holds the seeded values and the
operator has never customized it; `false` means a `PUT` has customized it.
The frontend uses this to show a "valores por defecto" hint (R15).

### `PUT /api/budget-parameters/{currency}` — Request

```json
{
  "electricity_price_kwh": 180.00,
  "error_margin_percent": 6.00,
  "margin_multiplier_wholesale": 3.50,
  "margin_multiplier_retail": 4.50,
  "margin_multiplier_keychain": 5.50
}
```

Full-replace upsert: all five fields required, no partial update. `currency`
is the path param (R6). Validation ranges per R5.

### `PUT /api/budget-parameters/{currency}` — Response (200)

```json
{
  "currency": "ARS",
  "electricity_price_kwh": 180.00,
  "error_margin_percent": 6.00,
  "margin_multiplier_wholesale": 3.50,
  "margin_multiplier_retail": 4.50,
  "margin_multiplier_keychain": 5.50,
  "is_default": false,
  "created_at": "2026-08-07T10:00:00Z",
  "updated_at": "2026-08-07T10:00:00Z"
}
```

### `PATCH /api/auth/me` — Request / Response (200)

```json
{ "currency": "USD" }
```
→
```json
{ "id": "uuid", "email": "maker@flayer.app", "name": "Maker", "currency": "USD" }
```

`UserResponse` gains `currency` (R13). `PATCH` accepts `{ "currency": ... }`
only; invalid value → 422 (R14).

### Budget endpoints — defaulting change

`BudgetCreate.currency` and `BudgetPreviewRequest.currency` change from
`str = "ARS"` to `str | None = None`. The router resolves `None` →
`current_user.currency` before calculation (R11, R12). `BudgetUpdate.currency`
keeps its current `None = unchanged` semantics. The DB column default `'ARS'`
on `budgets.currency` stays as a safety net for direct inserts.

## Service changes — `src/backend/services/budget_service.py`

**New async function — seed-on-first-access (no fallback):**

```python
async def get_budget_parameters(
    db: AsyncSession, user_id: UUID, currency: str
) -> dict[str, Decimal]:
```

Returns the 5 configurable values for `(user, currency)`. The function always
ends with a DB row: it `SELECT`s the `budget_parameters` row and, when it does
not exist, `INSERT`s it with the seed values (`is_default = TRUE`) before
returning. The `HARDCODED_DEFAULTS_{ARS,USD}` dicts are **deleted** — they are
never read at calculation time. Their values survive only as seed data used at
row creation (see "Technical decisions").

**The machine-parameter fallback is split out, not deleted:** the three
machine defaults (`machine_wattage`, `machine_cost`, `machine_lifespan_hours`)
are not part of this feature's configurable set (they belong to printer
profiles). They move to a dedicated `MACHINE_DEFAULTS_{ARS,USD}` constant used
only by `resolve_machine_params` — behavior unchanged.

**`calculate_breakdown` gains required parameters** (the `None → fallback`
mechanism is eliminated — every calculation is backed by a DB row):

```python
def calculate_breakdown(
    ...,
    currency: str,
    electricity_price_kwh: Decimal,
    error_margin_percent: Decimal,
    margin_multipliers: dict[str, Decimal],
    ...
)
```

`margin_multipliers` maps `"wholesale"/"retail"/"keychain"` → Decimal; the one
matching `margin_type` is used. `calculate_create` and `calculate_preview`
thread the same required kwargs through. Existing callers and unit tests that
called the calculator without these arguments are updated to pass them.

**Router orchestration (`src/backend/api/budget.py`):** in `create_budget`,
`update_budget`, and `preview_budget`, alongside the existing
`resolve_machine_params` call:

```
params = await get_budget_parameters(db, current_user.id, effective_currency)
```

and pass `params` values into the calculator. On save, snapshot
`electricity_price_kwh = params["electricity_price_kwh"]` into the budget row
(the other two snapshots already exist). On read (`_build_budget_response`),
recompute with the snapshotted values: `budget.electricity_price_kwh`
(or the current seeded value for `(user, currency)` when NULL — pre-feature
budgets, whose stored value is exactly the seed value), `budget.error_margin_percent`,
and a `margin_multipliers` dict where the snapshot `budget.margin_multiplier`
fills the entry matching `budget.margin_type` (R10).

## Data flow (PUT — upsert)

```
Operator → PUT /api/budget-parameters/ARS →
         → validate currency Literal (else 422, R6) →
         → validate 5 fields (ranges R5, else 422) →
         → SELECT budget_parameters WHERE user_id, currency
         → row exists? UPDATE in place : INSERT new row
         → set is_default = FALSE (first customization) →
         → commit → 200 with saved values + is_default: false
```

## Data flow (budget calculation)

```
Operator → POST /api/orders/{id}/budget →
         → currency = body.currency or current_user.currency (R11) →
         → params = get_budget_parameters(db, user_id, currency)
              (always returns a row — seeds on first access, R1, R8, R9)
         → machine_params = resolve_machine_params(printer, currency)  (existing)
         → calculate → snapshot electricity_price_kwh + error_margin_percent
                        + margin_multiplier into budgets row (R8, R10)
```

## Technical decisions

**Chosen: table `budget_parameters`, one row per `(user_id, currency)`.**
Discarded: a single row with both ARS and USD columns, and a per-parameter
table. Chosen: the per-currency row maps 1:1 to the pre-feature
`HARDCODED_DEFAULTS_{ARS,USD}` structure, the unique constraint enforces
"one config per currency" at the DB level, and the seeding logic stays a
simple `SELECT ... or INSERT`.

**Chosen: no soft-delete on `budget_parameters`.**
Discarded: `is_active` soft-delete. Chosen: the row is a live configuration,
not a business entity — its history has no value, and the upsert semantics
(R3, R4) overwrite it. Soft-delete is for entities with audit value
(printers, products, orders). The project convention covers business tables;
this is configuration.

**Chosen: `GET` returns effective values + `is_default`.**
Discarded: returning 404 or an empty body when no row exists. Chosen: the UI
must prefill editable fields even for unconfigured operators; the seed-on-first-
access guarantees the response is always populated, and `is_default: true`
lets the UI hint "estás usando los valores por defecto".

**Chosen: `PUT` full-replace upsert.**
Discarded: `PATCH` partial update, and a separate `POST` for create. Chosen:
the editor always submits the whole form (all five fields), partial updates
add complexity for no use case, and one verb that creates-or-updates removes
the "is it a 201 or 200" decision for the client. The UI never needs to know
whether a row existed.

**Chosen: hardcoded defaults are eliminated — seed-on-first-access.**
Discarded: keeping `HARDCODED_DEFAULTS_{ARS,USD}` as a runtime fallback
(human decision: eliminated — every read and every calculation must be backed
by a DB row). Chosen: `get_budget_parameters` inserts the row with the seed
values (`is_default = TRUE`) on first access and always returns a DB-backed
result. The former default values survive only as seed data at row creation;
the `is_default` column is flipped to `FALSE` by the first `PUT`, which also
keeps the UI hint working without any constant comparison. Guarantee for
unconfigured users (R9): the seed values equal the pre-feature values, so
calculations are identical. Discarded: a data migration seeding every existing
user — unnecessary, the lazy seed covers all users (existing and future) at
their first access. Discarded: seeding only at registration — new users are
covered, but existing users and any user-creation path not going through
`/register` would be unbacked.

**Chosen: new snapshot column `budgets.electricity_price_kwh`.**
Discarded: recomputing intermediates at read time with the *current*
parameters. Chosen: `final_price` is stored, so displaying intermediates
computed with newer values would contradict it. `error_margin_percent` and
`margin_multiplier` are already snapshotted; adding the electricity price
completes the set. Discarded: a `JSONB parameters_snapshot` column — the
three scalar snapshots match the existing pattern and are queryable.

**Chosen: currency defaulting resolved in the API layer, not the DB.**
Discarded: a DB trigger / default. Chosen: `users.currency` is a column, and
the router resolves `currency = None → current_user.currency` at the entry
points that create budgets. The DB `DEFAULT 'ARS'` on `budgets.currency`
remains only as an insert safety net.

**Chosen: `currency` validated with Pydantic `Literal`, stored as VARCHAR.**
Discarded: a PostgreSQL `ENUM`. Same pattern as
`printer_maintenance.maintenance_type` — adding a currency later is a
one-line schema change instead of a DB migration.

**Chosen: calculator stays pure and synchronous; DB lookup happens in the router layer.**
Discarded: making the calculator async and DB-aware. Chosen:
`calculate_breakdown`/`calculate_preview` take the resolved values as required
arguments (no `None` → fallback; every call is backed by a `budget_parameters`
row), and the endpoints do the async `get_budget_parameters` lookup exactly
where they already call `resolve_machine_params`. Unit-testable without a DB.

**Chosen: parameters live as a block in the Perfil page, not a standalone page.**
Discarded: a separate `/dashboard/parameters` page. Chosen: the values are the
operator's configuration — the Perfil page groups what belongs to the user,
and the ARS/USD toggle keeps the block compact. No other user-related section
or field is added to the Perfil page (user identity editing is out of scope).

## Frontend

### New page — `/dashboard/profile` — "Perfil" (R15, R16)

The page contains a single block: **"Parámetros del Maker"** — the operator's
budget configuration. No other user data is displayed or edited (name, email,
password etc. are out of scope).

- Protected dashboard page, same layout style as `/dashboard/printers`
- The block, in order:
  - **"Moneda por defecto"** selector (ARS/USD) — initialized from
    `fetchMe()`; on save calls `updateUserCurrency` (PATCH /api/auth/me) and
    updates the displayed default (R16)
  - Currency toggle (MUI `ToggleButtonGroup`, ARS / USD) that switches which
    currency's five fields are edited; both currencies' data come from one
    `GET /api/budget-parameters` call, kept in local state while editing
  - Five labeled inputs, prefilled from the response (R1, R2): Precio kWh,
    Margen de error %, Margen de ganancia mayorista / minorista / llaveros
    (margin multiplier fields: "Margen de ganacia mayorista (wholesale)",
    "Margen de ganancia minorista (retail)", "Margen de ganancia llaveros (keychain)")
  - "Guardar" button calls `PUT /api/budget-parameters/{currency}` with the
    current currency's values; success shows a confirmation (Snackbar)
- A currency marked `is_default: true` shows a hint that the default values
  are in use (using a logo of a star that represents the default)
- Frontend validation mirrors R5 (positive, ranges); 422 from the API shown
  inline

### Dashboard navigation

- Add nav item "Perfil" (icon `PersonIcon`) in a "Configuración" section of
  the dashboard sidebar `navItems`
  (`src/app/dashboard/layout.tsx`) (R15)

### `api.ts` — New types and functions

```typescript
export type Currency = 'ARS' | 'USD';

export interface User { id: string; email: string; name: string; currency: Currency; } // extended

export interface BudgetParameters {
  currency: Currency;
  electricity_price_kwh: number;
  error_margin_percent: number;
  margin_multiplier_wholesale: number;
  margin_multiplier_retail: number;
  margin_multiplier_keychain: number;
  is_default: boolean;
}

export interface BudgetParametersBundle {
  parameters: Record<Currency, BudgetParameters>;
}

export interface BudgetParametersUpdate {
  electricity_price_kwh: number;
  error_margin_percent: number;
  margin_multiplier_wholesale: number;
  margin_multiplier_retail: number;
  margin_multiplier_keychain: number;
}

fetchBudgetParameters(): Promise<BudgetParametersBundle>          // GET  /api/budget-parameters
updateBudgetParameters(currency: Currency, payload: BudgetParametersUpdate): Promise<BudgetParameters>  // PUT
updateUserCurrency(currency: Currency): Promise<User>             // PATCH /api/auth/me
```

### Budget form (`BudgetForm.tsx`) — R17

- The currency selector is preselected to the operator's default currency
  (`fetchMe()` from `api.ts`, or the user already cached by `auth-context`),
  instead of the hardcoded `'ARS'`
- Manual currency switching keeps working; `BudgetCreate`/`BudgetPreviewRequest`
  payload types change `currency` to `Currency | null` (omit → server default)

### `data_model.md` follow-up (implementer edits after this feature lands)

- Add the `budget_parameters` table schema (already listed as owned by
  `region_parameters` in "Entities and Ownership")
- Add `users.currency` to the `users` description
- Add `budgets.electricity_price_kwh` snapshot column
- Fix the relationship diagram line `budgets ──── budget_parameters`
  (no FK exists — the table belongs to `users`) and add
  `users ──── budget_parameters`
- Budget formula section: state that `electricity_price_kwh`,
  `error_margin_percent`, and the three multipliers come from
  `budget_parameters` per `(user, currency)`, seeded on first access
