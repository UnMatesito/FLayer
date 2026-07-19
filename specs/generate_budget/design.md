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

**Hardcoded defaults** (in the `BudgetCalculator` service, not in DB):

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

The calculator uses the ARS or USD column based on the `currency` field of the budget. These values are hardcoded in the service layer. Future: move to `printer_profiles` and user settings.

**Formula (in code, in a service layer):**

```
if manual_filament_cost is not null:
    filament_total = manual_filament_cost
else:
    filament_total = sum(item.cost) for all filament_items

electricity_cost       = (hours + min/60) × (machine_wattage / 1000) × electricity_price_kwh
amortization_cost      = (hours + min/60) × (machine_cost / machine_lifespan_hours)
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
| `POST` | `/api/orders/{order_id}/budget` | Yes | Create budget (R1, R2, R3, R4, R8) |
| `GET` | `/api/orders/{order_id}/budget` | Yes | Get budget for order (R9, R10) |
| `PUT` | `/api/orders/{order_id}/budget` | Yes | Update budget (R1, R2, R3, R4) |
| `PATCH` | `/api/orders/{order_id}/budget/status` | Yes | Change status (R6, R7) |
| `POST` | `/api/orders/{order_id}/budget/preview` | Yes | Calculate without persisting (R3) |

### `GET /api/products` — Existing endpoint, used by budget form to list filaments

The budget form fetches products with type=`filament` to populate the filament selector.

### `POST /api/orders/{order_id}/budget` — Request

```json
{
  "currency": "ARS",
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

When `manual_filament_cost` is set (not null), `filament_items` can be empty or is ignored for calculation.

### `POST /api/orders/{order_id}/budget` — Response (201)

```json
{
  "id": "...",
  "order_id": "...",
  "version": 1,
  "currency": "ARS",
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

Intermediate fields (`filament_total`, `electricity_cost`, `amortization_cost`, `subtotal`, `subtotal_with_error`, `total_before_margin`, `ml_price`) are computed at read time, not stored.

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
- Status transitions: `draft → sent → approved|rejected` (cannot skip `sent`)

## Technical decisions

**Multi-filament items as JSONB.**
Discarded alternative: a separate `budget_filament_items` table with FK to `budgets`. Chosen: JSONB for MVP simplicity. A normalized table can be introduced later when querying/managing individual items across budgets becomes necessary.

**Hardcoded defaults.**
No configurable parameters in the DB for MVP. The machine parameters (`machine_wattage`, `machine_cost`, `machine_lifespan_hours`) will migrate to `printer_profiles` in the future. Electricity price, error margin, and multipliers can be promoted to user settings when needed.

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
   - Displays MercadoLibre price as a convenience line
   - Status chip with color (draft=default, sent=info, approved=success, rejected=error)
   - Action buttons: Send, Approve, Reject (based on current status)

4. **Update `ActiveOrdersTable.tsx`** — add a "Budget" column showing status or action button
   - If no budget: "Presupuestar" button
   - If budget exists: status chip (draft/sent/approved/rejected)
   - Click on row navigates to order detail page

5. **Update `api.ts`** — add types and fetch functions for all budget endpoints

### No Budget Parameters page or navigation link — removed for MVP.
