# Design — generate_budget

## Tables

### `budget_parameters` (new — merged from `region_parameters`)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | Multi-tenant ready |
| `key` | VARCHAR(100) | NOT NULL | e.g., `filament_price_per_kg` |
| `value` | DECIMAL(12,2) | NOT NULL | |
| `unit` | VARCHAR(50) | NULLABLE | e.g., `USD/kg`, `USD/kWh` |
| `description` | TEXT | NULLABLE | Human-readable label |
| `created_at` | TIMESTAMPTZ | NOT NULL, `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `now()` | |

`UNIQUE(user_id, key)` — one value per key per tenant.

**Seeded keys and defaults:**

| Key | Default | Unit | Description |
|---|---|---|---|
| `filament_price_per_kg` | 25.00 | USD/kg | Filament cost per kilogram |
| `electricity_price_kwh` | 0.15 | USD/kWh | Electricity cost per kWh |
| `machine_wattage` | 350 | W | Printer power consumption |
| `machine_cost` | 800.00 | USD | Printer purchase cost |
| `machine_lifespan_hours` | 5000 | hours | Expected printer lifespan |
| `error_margin_percent` | 10.00 | % | Calibration waste margin |
| `margin_multiplier_wholesale` | 2.50 | multiplier | Wholesale markup |
| `margin_multiplier_retail` | 3.50 | multiplier | Retail markup |
| `margin_multiplier_keychain` | 2.00 | multiplier | Small parts markup |

### `budgets` (new)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `order_id` | UUID | FK → `orders.id`, NOT NULL | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | Denormalized for query convenience |
| `version` | INT | NOT NULL, DEFAULT 1 | Incremented on re-budget after rejection |
| `grams` | DECIMAL(10,2) | NOT NULL | Filament weight |
| `hours` | INT | NOT NULL, DEFAULT 0 | Print time hours |
| `minutes` | INT | NOT NULL, DEFAULT 0 | Print time minutes (0–59) |
| `margin_type` | VARCHAR(20) | NOT NULL, DEFAULT `retail` | One of: `wholesale`, `retail`, `keychain` |
| `filament_cost` | DECIMAL(12,2) | NOT NULL | Calculated |
| `electricity_cost` | DECIMAL(12,2) | NOT NULL | Calculated |
| `amortization_cost` | DECIMAL(12,2) | NOT NULL | Calculated |
| `subtotal` | DECIMAL(12,2) | NOT NULL | Sum of three costs |
| `error_margin_percent` | DECIMAL(5,2) | NOT NULL | Snapshot of the parameter at calc time |
| `subtotal_with_error` | DECIMAL(12,2) | NOT NULL | subtotal × (1 + error_margin_percent/100) |
| `margin_multiplier` | DECIMAL(5,2) | NOT NULL | Snapshot of the multiplier at calc time |
| `final_price` | DECIMAL(12,2) | NOT NULL | Calculated or manual |
| `manual_price` | DECIMAL(12,2) | NULLABLE | Override — when set, `final_price` = this |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `draft` | `draft`, `sent`, `approved`, `rejected` |
| `notes` | TEXT | NULLABLE | Internal notes |
| `sent_to_client` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `sent_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `now()` | |

`UNIQUE(order_id, version)` — one budget per order per version.

**Formula (in code, in a service layer):**

```
filament_cost          = (grams / 1000) × filament_price_per_kg
electricity_cost       = (hours + min/60) × (machine_wattage / 1000) × electricity_price_kwh
amortization_cost      = (hours + min/60) × (machine_cost / machine_lifespan_hours)
subtotal               = filament_cost + electricity_cost + amortization_cost
subtotal_with_error    = subtotal × (1 + error_margin_percent / 100)
final_price            = subtotal_with_error × margin_multiplier
```

If `manual_price` is set, `final_price` = `manual_price` (the calculated price is preserved in the breakdown for reference).

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `GET` | `/api/budget-parameters` | Yes | List all parameters (R1, R2, R3) |
| `PUT` | `/api/budget-parameters` | Yes | Upsert parameters (R1, R2, R3, R10) |
| `POST` | `/api/orders/{order_id}/budget` | Yes | Create budget (R5, R6, R11) |
| `GET` | `/api/orders/{order_id}/budget` | Yes | Get budget for order (R12, R13) |
| `PUT` | `/api/orders/{order_id}/budget` | Yes | Update budget (grams/hours/manual_price) (R5, R6) |
| `PATCH` | `/api/orders/{order_id}/budget/status` | Yes | Change status (R8, R9) |
| `POST` | `/api/orders/{order_id}/budget/preview` | Yes | Calculate without persisting (R5) |

### `GET /api/budget-parameters` — Response

```json
[
  { "key": "filament_price_per_kg", "value": 25.00, "unit": "USD/kg", "description": "..." },
  { "key": "electricity_price_kwh", "value": 0.15, "unit": "USD/kWh", "description": "..." }
]
```

### `PUT /api/budget-parameters` — Request

```json
{
  "parameters": [
    { "key": "filament_price_per_kg", "value": 30.00 },
    { "key": "electricity_price_kwh", "value": 0.18 }
  ]
}
```

Responds with the full updated list. Keys not sent keep their current value. Keys with `value = null` are reset to default.

### `POST /api/orders/{order_id}/budget` — Request

```json
{
  "grams": 150.00,
  "hours": 4,
  "minutes": 30,
  "margin_type": "retail",
  "manual_price": null,
  "notes": "First quote"
}
```

### `POST /api/orders/{order_id}/budget` — Response (201)

```json
{
  "id": "...",
  "order_id": "...",
  "version": 1,
  "grams": 150.00,
  "hours": 4,
  "minutes": 30,
  "margin_type": "retail",
  "filament_cost": 3.75,
  "electricity_cost": 0.24,
  "amortization_cost": 0.76,
  "subtotal": 4.75,
  "error_margin_percent": 10.00,
  "subtotal_with_error": 5.23,
  "margin_multiplier": 3.50,
  "final_price": 18.30,
  "manual_price": null,
  "status": "draft",
  "notes": "First quote",
  "created_at": "...",
  "updated_at": "..."
}
```

### `PATCH /api/orders/{order_id}/budget/status` — Request

```json
{ "status": "sent" }
```

On `approved`: also updates `orders.status` to `approved`.
On `sent`: triggers email to client.
On `rejected`: increments version if a new budget is created later.

## Validation rules

- `grams` > 0, max 999999.99
- `hours` >= 0, max 9999
- `minutes` 0–59
- `margin_type` one of: `wholesale`, `retail`, `keychain`
- `manual_price` >= 0 or null
- Parameter values: > 0 (R10)
- Status transitions: `draft → sent → approved|rejected` (cannot skip `sent`)

## Technical decisions

**Snapshot parameter values at calculation time.**
The budget stores `error_margin_percent` and `margin_multiplier` as snapshots rather than always reading from `budget_parameters`. This ensures that changing parameters later does not retroactively alter existing budgets. Discarded alternative: live references that automatically update — rejected because budgets are legal documents that must be immutable after approval.

**Single machine profile for MVP.**
Discarded alternative: multiple machine profiles (multiple printers with different costs). Chosen: one profile stored as simple budget_parameters keys. Multiple machines can be added later in `printer_profiles`.

**Budget is order-scoped, not customer-scoped.**
A budget always belongs to an order. Discarded alternative: budgets could be independent of orders (for "quick quotes"). Chosen: MVP owns the order → budget flow; standalone quotes are future.

**Manual price override preserves auto-calculation.**
The breakdown (filament_cost, electricity_cost, etc.) is always recalculated from inputs. If `manual_price` is set, `final_price` shows the manual value but the calculated price is still visible in the breakdown. This lets the operator adjust for market conditions without losing the cost basis.

**Status `draft → sent → approved|rejected` flow.**
Discarded alternative: allow direct `draft → approved`. Chosen: sending to the client is always an explicit step, matching real business practice even when the conversation happens outside the system.

**No budget revision history table for MVP.**
Multiple versions are stored in the same `budgets` table with an incrementing `version` column. The `GET` endpoint returns the latest version. If full revision history is needed later, a `budget_versions` archive table can be added.

## Email trigger

When status changes to `sent`, the system calls:
```
email_service.send_budget_provided(order, budget, to)
```
This feature defines the interface and call but **does not implement the email service itself** — that belongs to `email_notifications`. Mocked in tests.

## Frontend

### New pages/components:

1. **`src/app/dashboard/budget-parameters/page.tsx`** — form for configuring budget parameters (R1, R2, R3)
   - MUI `TextField` for each parameter with number input
   - Save button calls `PUT /api/budget-parameters`
   - Snackbar on success/error

2. **`src/app/dashboard/orders/[id]/page.tsx`** — order detail page (R12, R13)
   - Shows order info (reuse data from order response)
   - Budget section:
     - If no budget: empty state + "Generate Budget" button → creates draft
     - If budget exists: budget breakdown table, status chip, action buttons

3. **`src/components/BudgetForm.tsx`** — budget creation/editing form
   - Inputs: grams, hours, minutes, margin_type selector
   - Shows live breakdown as values are entered (or on save)
   - Manual price override field
   - Notes textarea
   - Submit calls POST or PUT

4. **`src/components/BudgetBreakdown.tsx`** — read-only budget display
   - Table or list showing each cost line item
   - Shows formulas applied
   - Status chip with color (draft=default, sent=info, approved=success, rejected=error)
   - Action buttons: Send, Approve, Reject (based on current status)

5. **Update `ActiveOrdersTable.tsx`** — add a "Budget" column showing status or action button
   - If no budget: "Presupuestar" button
   - If budget exists: status chip (draft/sent/approved/rejected)
   - Click on row navigates to order detail page

6. **Update `api.ts`** — add types and fetch functions for all budget endpoints

7. **Navigation** — add a "Budget Parameters" link to the dashboard nav
