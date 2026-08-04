# Design — generate_budget

## Tables

### `budgets` (new)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `order_id` | UUID | FK → `orders.id`, NOT NULL | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | Denormalized for query convenience |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT `ARS` | `ARS` or `USD`, set by the operator in the form |
| `version` | INT | NOT NULL, DEFAULT 1 | Incremented on re-budget after rejection |
| `filament_items` | JSONB | NOT NULL, DEFAULT '[]' | Array of filament items (see below) |
| `manual_filament_cost` | DECIMAL(12,2) | NULLABLE | Override — when set, replaces filament_items calculation |
| `hours` | INT | NOT NULL, DEFAULT 0 | Print time hours |
| `minutes` | INT | NOT NULL, DEFAULT 0 | Print time minutes (0–59) |
| `extra_costs` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Extra supplies/insumos cost |
| `margin_type` | VARCHAR(20) | NOT NULL, DEFAULT `retail` | One of: `wholesale`, `retail`, `keychain` |
| `error_margin_percent` | DECIMAL(5,2) | NOT NULL | Snapshot of hardcoded default at calc time |
| `margin_multiplier` | DECIMAL(5,2) | NOT NULL | Snapshot of the multiplier at calc time |
| `printer_id` | UUID | NULLABLE, FK → `printers(id)` | Selected printer profile (R11); provenance only |
| `power_watts` | DECIMAL(7,2) | NULLABLE, `CHECK (power_watts >= 0)` | Snapshot of machine power at calc time; `NULL` = defaults used |
| `lifespan_hours` | DECIMAL(10,2) | NULLABLE, `CHECK (lifespan_hours >= 0)` | Snapshot of machine lifespan at calc time |
| `spare_parts_cost` | DECIMAL(12,2) | NULLABLE, `CHECK (spare_parts_cost >= 0)` | Snapshot of spare parts cost at calc time |
| `final_price` | DECIMAL(12,2) | NOT NULL | Calculated or manual |
| `manual_price` | DECIMAL(12,2) | NULLABLE | Override — when set, `final_price` = this |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `draft` | `draft`, `sent`, `approved`, `rejected` |
| `notes` | TEXT | NULLABLE | Internal notes |
| `sent_to_client` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `sent_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `now()` | |

`UNIQUE(order_id, version)` — one budget per order per version.

**`filament_items` JSONB structure:**

```json
[
  {
    "product_id": "uuid",
    "product_name": "PLA Negro",
    "sku": "PLA-NEG-175",
    "grams": 50.00,
    "price_per_kg": 17000.00,
    "cost": 850.00
  }
]
```

- `product_id`: FK to `products.id` (nullable — allows entering a name without a product reference)
- `product_name`, `sku`: snapshot for display even if product is later deleted
- `grams`: weight of this filament used (> 0)
- `price_per_kg`: snapshot of the product's price at budget time
- `cost`: computed as `(grams / 1000) × price_per_kg`

When `manual_filament_cost` is not null, `filament_items` is ignored for calculation (but still displayed if present).

Only `final_price` is stored from the calculation. All intermediate values (filament_total, electricity_cost, amortization_cost, subtotal, subtotal_with_error, total_before_margin) and `ml_price` are computed on-the-fly at read time, never persisted.

**Hardcoded defaults** (in the `BudgetCalculator` service, not in DB) — used
when no printer profile is selected (R11):

| Parameter | Default (ARS) | Default (USD) | Notes |
|---|---|---|---|
| `electricity_price_kwh` | 140.00 | 0.15 | |
| `machine_wattage` | 120 | 120 | Bambu Lab A1 reference |
| `machine_cost` | 150000.00 | 400.00 | Spare parts / machine cost |
| `machine_lifespan_hours` | 4320 | 5000 | |
| `error_margin_percent` | 5.00 | 5.00 | Calibration waste margin |
| `margin_multiplier_wholesale` | 3.00 | 3.00 | |
| `margin_multiplier_retail` | 4.00 | 4.00 | |
| `margin_multiplier_keychain` | 5.00 | 5.00 | |

**Machine parameters resolution (R11):** when the request carries a
`printer_id`, the service loads the printer (tenant-scoped, 404 if it does not
exist or belongs to another user) and maps its profile fields to the formula
inputs: `power_watts` → `machine_wattage`, `spare_parts_cost` → `machine_cost`,
`lifespan_hours` → `machine_lifespan_hours`. Per-field fallback: if a profile
field is `NULL`, the currency default is used for that field. If no
`printer_id` is provided, all three come from the currency defaults. The
resolved values are snapshotted into `budgets.power_watts`,
`budgets.lifespan_hours`, `budgets.spare_parts_cost` at save time, so later
edits to the printer profile never alter existing budgets. `printer_id` is
stored for provenance and display only.

**Currency note:** `printers.spare_parts_cost` has no currency of its own; the
value is used as-is in the budget's currency. The operator enters the cost in
the currency they price budgets in. Conversion is out of scope.

**Formula (in code, in a service layer):**

```
if manual_filament_cost is not null:
    filament_total = manual_filament_cost
else:
    filament_total = sum(item.cost) for all filament_items

power_watts        = printer.power_watts     if printer selected and not null else default
spare_parts_cost   = printer.spare_parts_cost if printer selected and not null else default
lifespan_hours     = printer.lifespan_hours  if printer selected and not null else default

electricity_cost       = (hours + min/60) × (power_watts / 1000) × electricity_price_kwh
amortization_cost      = (hours + min/60) × (spare_parts_cost / lifespan_hours)
subtotal               = filament_total + electricity_cost + amortization_cost
subtotal_with_error    = subtotal × (1 + error_margin_percent / 100)
total_before_margin    = subtotal_with_error + extra_costs
final_price            = total_before_margin × margin_multiplier
```

If `manual_price` is set, `final_price` = `manual_price` (the calculated price is preserved in the breakdown for reference).

**MercadoLibre price (computed on-the-fly, not stored):**
```
ml_price = final_price × 1.30
```

## Margin multipliers

| Type | Multiplier |
|---|---|
| `wholesale` | 3.00 |
| `retail` | 4.00 |
| `keychain` | 5.00 |

Hardcoded for MVP.

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `POST` | `/api/orders/{order_id}/budget` | Yes | Create budget (R1, R2, R3, R4, R8, R11) |
| `GET` | `/api/orders/{order_id}/budget` | Yes | Get budget for order (R9, R10, R11) |
| `PUT` | `/api/orders/{order_id}/budget` | Yes | Update budget (R1, R2, R3, R4, R11) |
| `PATCH` | `/api/orders/{order_id}/budget/status` | Yes | Change status (R6, R7) |
| `POST` | `/api/orders/{order_id}/budget/preview` | Yes | Calculate without persisting (R3, R11) |

### `GET /api/products` — Existing endpoint, used by budget form to list filaments

The budget form fetches products with type=`filament` to populate the filament selector.

### `GET /api/printers` — Endpoint from `printer_profiles`, used by budget form

The budget form fetches the operator's active printers to populate the
printer select (R11).

### `POST /api/orders/{order_id}/budget` — Request

```json
{
  "currency": "ARS",
  "printer_id": "uuid-of-printer", 
  "filament_items": [
    { "product_id": "uuid-1", "grams": 50.00 },
    { "product_id": "uuid-2", "grams": 30.00 }
  ],
  "manual_filament_cost": null,
  "hours": 4,
  "minutes": 30,
  "margin_type": "retail",
  "extra_costs": 0.00,
  "manual_price": null,
  "notes": "First quote"
}
```

`printer_id` is optional (omit or `null` → hardcoded defaults are used).
When `manual_filament_cost` is set (not null), `filament_items` can be empty or is ignored for calculation.

### `POST /api/orders/{order_id}/budget` — Response (201)

```json
{
  "id": "...",
  "order_id": "...",
  "version": 1,
  "currency": "ARS",
  "printer_id": "uuid-of-printer",
  "printer_name": "Ender 3 Pro",
  "power_watts": 120.00,
  "lifespan_hours": 4320.00,
  "spare_parts_cost": 400.00,
  "filament_items": [
    { "product_id": "uuid-1", "product_name": "PLA Negro", "sku": "PLA-NEG-175", "grams": 50.00, "price_per_kg": 17000.00, "cost": 850.00 },
    { "product_id": "uuid-2", "product_name": "PLA Blanco", "sku": "PLA-BLAN-175", "grams": 30.00, "price_per_kg": 17000.00, "cost": 510.00 }
  ],
  "manual_filament_cost": null,
  "hours": 4,
  "minutes": 30,
  "margin_type": "retail",
  "extra_costs": 0.00,
  "error_margin_percent": 5.00,
  "margin_multiplier": 4.00,
  "final_price": 21855.00,
  "manual_price": null,
  "ml_price": 28411.50,
  "filament_total": 1360.00,
  "electricity_cost": 18.90,
  "amortization_cost": 28.13,
  "subtotal": 1406.03,
  "subtotal_with_error": 1477.23,
  "total_before_margin": 1477.23,
  "status": "draft",
  "notes": "First quote",
  "created_at": "...",
  "updated_at": "..."
}
```

Intermediate fields (`filament_total`, `electricity_cost`, `amortization_cost`, `subtotal`, `subtotal_with_error`, `total_before_margin`, `ml_price`) are computed at read time, not stored. `printer_name` is joined at read time from `printers` for display (NULL when no printer). `power_watts`, `lifespan_hours`, `spare_parts_cost` in the response are the snapshotted values used in the calculation.

### `PATCH /api/orders/{order_id}/budget/status` — Request

```json
{ "status": "sent" }
```

On `approved`: also updates `orders.status` to `approved`.
On `sent`: triggers email to client.
On `rejected`: increments version if a new budget is created later.

## Validation rules

- `filament_items`: at least one item required when `manual_filament_cost` is null
- For each filament item: `grams` > 0, `product_id` must reference an existing product if provided
- `manual_filament_cost` >= 0 or null
- `hours` >= 0, max 9999
- `minutes` 0–59
- `extra_costs` >= 0
- `margin_type` one of: `wholesale`, `retail`, `keychain`
- `manual_price` >= 0 or null
- `printer_id` optional; must reference a printer that exists and belongs to
  the operator, else 404 (no data leak, same rule as tenant-scoped endpoints)
- Status transitions: `draft → sent → approved|rejected` (cannot skip `sent`)

## Technical decisions

**Multi-filament items as JSONB.**
Discarded alternative: a separate `budget_filament_items` table with FK to `budgets`. Chosen: JSONB for MVP simplicity. A normalized table can be introduced later when querying/managing individual items across budgets becomes necessary.

**Hardcoded defaults with printer profile override.**
No configurable parameters in the DB for MVP. The machine parameters
(`machine_wattage`, `machine_cost`, `machine_lifespan_hours`) migrate to
`printer_profiles` (fields `power_watts`, `spare_parts_cost`,
`lifespan_hours`) and are loaded into the calculation when the operator
selects a printer (R11). When no printer is selected, the currency defaults
still apply, so the existing flow keeps working. Electricity price, error
margin, and multipliers can be promoted to user settings when needed.

**Snapshot machine parameters at budget time.**
Discarded: reading the printer profile live at read time. Chosen: the three
resolved machine values are persisted on the budget row at save time (same
pattern as the `price_per_kg` item snapshots, `error_margin_percent`, and
`margin_multiplier`). A budget is a quote: editing a printer profile later
(e.g. a new spare parts price) must never retroactively change quotes already
sent to clients. `printer_id` is kept as provenance/display only. The
snapshot columns are NULLable — `NULL` means the budget predates the feature
or used defaults, and read time falls back to the currency defaults.

**Snapshot product price at budget time.**
Each filament item stores a snapshot of `price_per_kg` so changing the product price later does not retroactively alter existing budgets.

**Manual filament cost overrides items.**
When `manual_filament_cost` is set, `filament_items` are not used in calculation but remain visible in the breakdown for reference. This covers the "I don't know yet" scenario.

**Formula and intermediate values computed on read.**
Only inputs + `final_price` are stored. Everything else is recalculated from the formula. This keeps the data model minimal and the formula the single source of truth.

## Email trigger

When status changes to `sent`, the system calls:
```
email_service.send_budget_provided(order, budget, to)
```
This feature defines the interface and call but **does not implement the email service itself** — that belongs to `email_notifications`. Mocked in tests.

## Frontend

### New pages/components:

1. **`src/app/dashboard/orders/[id]/page.tsx`** — order detail page (R9, R10)
   - Shows order info (reuse data from order response)
   - Budget section:
     - If no budget: empty state + "Generate Budget" button → creates draft
     - If budget exists: budget breakdown table, filament items list, status chip, action buttons

2. **`src/components/BudgetForm.tsx`** — budget creation/editing form
   - Currency selector at the top (ARS / USD) — changes currency symbol and selects which hardcoded defaults to use
   - Printer selector (R11): "Impresora" select populated from `GET /api/printers`
     (active printers only), value = `printer_id`, optional ("Sin impresora" /
     defaults option). Placed next to the currency selector. When a printer is
     picked, its `power_watts`, `lifespan_hours`, `spare_parts_cost` drive the
     calculation; the live preview shows the selected printer's machine values
     in the electricity / amortization rows
   - Filament items section: list of rows, each with product selector (dropdown from `GET /products?type=filament`), grams input
   - "Add filament" button to add rows
   - Toggle to switch to manual filament cost (single number input)
   - Inputs: hours, minutes, extra_costs, margin_type selector
   - Shows live breakdown as values are entered (or on save)
   - Manual price override field
   - Notes textarea
   - Submit calls POST or PUT

3. **`src/components/BudgetBreakdown.tsx`** — read-only budget display
   - Table or list showing each cost line item (filaments list, electricity, amortization, error margin, extra costs, subtotal, margin applied)
   - Shows the machine parameters used: printer name when a profile was
     selected (or "parámetros por defecto"), power watts, lifespan hours,
     spare parts cost (R11)
   - Displays MercadoLibre price as a convenience line
   - Status chip with color (draft=default, sent=info, approved=success, rejected=error)
   - Action buttons: Send, Approve, Reject (based on current status)

4. **Update `ActiveOrdersTable.tsx`** — add a "Budget" column showing status or action button
   - If no budget: "Presupuestar" button
   - If budget exists: status chip (draft/sent/approved/rejected)
   - Click on row navigates to order detail page

5. **Update `api.ts`** — add types and fetch functions for all budget endpoints
   - `BudgetCreate` / `BudgetUpdate` / `BudgetPreviewRequest` gain optional `printer_id`
   - `BudgetResponse` gains `printer_id`, `printer_name`, `power_watts`,
     `lifespan_hours`, `spare_parts_cost`
   - Reuse `fetchPrinters` from `printer_profiles` for the printer select

### No Budget Parameters page or navigation link — removed for MVP.
