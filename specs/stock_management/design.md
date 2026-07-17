# Design — stock_management

## Tables

### `filaments` (new)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users.id` | Tenant ownership |
| `color_name` | VARCHAR(100) | NOT NULL | e.g. "PLA Silk Gold" |
| `color_hex` | VARCHAR(7) | NOT NULL | e.g. "#FFD700" |
| `filament_type` | VARCHAR(50) | NOT NULL | e.g. "PLA", "PETG", "TPU", "ABS" |
| `weight_grams` | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Current available weight; may go negative (oversell permitted) |
| `price_per_kg` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Cost per kilogram in the configured currency |
| `min_stock_warning_grams` | DECIMAL(10,2) | NOT NULL, DEFAULT 200 | Threshold below which low-stock warning triggers |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete / archive |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Indexes:
- `(user_id, is_active)` — filtered active filaments per tenant
- `(user_id, color_name)` — unique per tenant (no duplicate color names)

### `stock_movements` (new) — Immutable audit log

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users.id` | Tenant ownership |
| `filament_id` | UUID | NOT NULL, FK → `filaments.id` | |
| `movement_type` | VARCHAR(20) | NOT NULL | Enum: `consumption`, `adjustment`, `reversal` |
| `quantity_grams` | DECIMAL(10,2) | NOT NULL | Negative for consumption, positive for reversal/adjustment |
| `order_id` | UUID | NULLABLE, FK → `orders.id` | NULL when movement is manual adjustment |
| `created_by_user_id` | UUID | NOT NULL, FK → `users.id` | Who performed the action |
| `notes` | TEXT | NULLABLE | Free-text reason for adjustment movements |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Immutable — no updated_at |

Indexes:
- `(user_id, filament_id, created_at DESC)` — per-filament history
- `(order_id)` — lookup movements by order for cancellation reversal

### `supplies` (new)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users.id` | Tenant ownership |
| `name` | VARCHAR(200) | NOT NULL | e.g. "Isopropyl Alcohol", "Nozzle 0.4mm" |
| `quantity` | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Current count/volume |
| `unit` | VARCHAR(30) | NOT NULL | e.g. "liters", "units", "kg", "meters" |
| `min_stock_warning` | DECIMAL(10,2) | NOT NULL, DEFAULT 1 | Threshold for low-stock flag |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete / archive |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

Indexes:
- `(user_id, is_active)`

### Existing table modified: `orders`

Add column:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `filament_id` | UUID | NULLABLE, FK → `filaments.id` | Which filament this order uses (null until assigned) |
| `grams` | DECIMAL(10,2) | NULLABLE | Estimated grams for this order (from budget or manual entry) |

These columns are nullable because an order may be created before stock management is active or before filament assignment.

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `GET` | `/api/filaments` | Yes | List active filaments (R2) |
| `POST` | `/api/filaments` | Yes | Create filament (R1) |
| `GET` | `/api/filaments/{filament_id}` | Yes | Get single filament detail |
| `PATCH` | `/api/filaments/{filament_id}` | Yes | Update filament (edit color, price, warning threshold, archive) (R3, R12) |
| `PATCH` | `/api/filaments/{filament_id}/adjust` | Yes | Adjust weight atomically (R3) |
| `GET` | `/api/supplies` | Yes | List active supplies (R5) |
| `POST` | `/api/supplies` | Yes | Create supply (R4) |
| `GET` | `/api/supplies/{supply_id}` | Yes | Get single supply detail |
| `PATCH` | `/api/supplies/{supply_id}` | Yes | Update supply quantity or info (R5) |
| `GET` | `/api/stock-movements` | Yes | Paginated movement history with filters (R8) |
| `GET` | `/api/stock-movements/{filament_id}` | Yes | Movements for a specific filament (R8) |
| `GET` | `/api/stock/low-stock` | Yes | Return filaments and supplies below threshold (R9) |

### `POST /api/filaments` — Request

```json
{
  "color_name": "PLA Silk Gold",
  "color_hex": "#FFD700",
  "filament_type": "PLA",
  "weight_grams": 1000.00,
  "price_per_kg": 25.00,
  "min_stock_warning_grams": 200.00
}
```

### `POST /api/filaments` — Response (201)

```json
{
  "id": "uuid",
  "color_name": "PLA Silk Gold",
  "color_hex": "#FFD700",
  "filament_type": "PLA",
  "weight_grams": 1000.00,
  "price_per_kg": 25.00,
  "min_stock_warning_grams": 200.00,
  "is_active": true,
  "created_at": "...",
  "updated_at": "..."
}
```

### `PATCH /api/filaments/{filament_id}/adjust` — Request

```json
{
  "delta_grams": -50.00,
  "notes": "Manual calibration adjustment"
}
```

### `PATCH /api/filaments/{filament_id}/adjust` — Response (200)

```json
{
  "id": "uuid",
  "weight_grams": 950.00,
  "movement_id": "uuid"
}
```

### `GET /api/stock-movements` — Query params

`?filament_id=uuid&movement_type=consumption&order_id=uuid&date_from=2026-01-01&date_to=2026-01-31&page=1&per_page=20`

### `GET /api/stock-movements` — Response

```json
{
  "items": [
    {
      "id": "uuid",
      "filament_id": "uuid",
      "filament_color_name": "PLA Silk Gold",
      "movement_type": "consumption",
      "quantity_grams": -150.00,
      "order_id": "uuid",
      "order_reference": "ORD-001",
      "created_by_user_id": "uuid",
      "notes": null,
      "created_at": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

### `GET /api/stock/low-stock` — Response

```json
{
  "filaments": [
    {
      "id": "uuid",
      "color_name": "PLA Silk Gold",
      "weight_grams": 50.00,
      "min_stock_warning_grams": 200.00
    }
  ],
  "supplies": [
    {
      "id": "uuid",
      "name": "Keychains",
      "quantity": 2,
      "unit": "unit",
      "min_stock_warning": 1.0
    }
  ]
}
```

## Business Logic

### 1. Atomic stock deduction (trigger: order → ready)

Called from `PATCH /api/orders/{order_id}/status` when new status is `ready`.

```
def deduct_stock(order_id, filament_id, grams, user_id):
    BEGIN TRANSACTION;
    UPDATE filaments
      SET weight_grams = weight_grams - :grams
      WHERE id = :filament_id AND user_id = :user_id;
    INSERT INTO stock_movements (filament_id, movement_type, quantity_grams,
                                 order_id, created_by_user_id)
      VALUES (:filament_id, 'consumption', -:grams, :order_id, :user_id);
    IF weight_grams < 0 AFTER UPDATE:
      LOG WARNING "Stock went negative for filament {id} — oversell";
    COMMIT;
```

The warning is informational only — the transaction is not rolled back.

### 2. Stock reversal (trigger: order → cancelled, from status ready only)

```
def reverse_stock(order_id, user_id):
    movements = SELECT * FROM stock_movements
                WHERE order_id = :order_id AND movement_type = 'consumption';
    FOR each movement in movements:
        BEGIN TRANSACTION;
        UPDATE filaments
          SET weight_grams = weight_grams + ABS(movement.quantity_grams)
          WHERE id = movement.filament_id AND user_id = :user_id;
        INSERT INTO stock_movements (filament_id, movement_type, quantity_grams,
                                     order_id, created_by_user_id)
          VALUES (movement.filament_id, 'reversal',
                  ABS(movement.quantity_grams), :order_id, :user_id);
        COMMIT;
```

If no `consumption` movements exist for the order (order was not yet `ready`), no reversal is needed.

### 3. Stock validation before ready

When status → `ready`, the system checks `filaments.weight_grams >= grams_estimated`. If insufficient:
- The transition **is not blocked** (oversell permitted).
- A warning is logged: `"Insufficient stock for order {id}: required {grams}, available {available}"`.
- The frontend shows a confirmation dialog: "This order requires {grams}g but only {available}g are available. Proceed anyway?"

## Integration with Existing Status Machine

The status transition endpoint `PATCH /api/orders/{order_id}/status` (from `order_status`) is modified to add stock hooks:

1. Validate transition (existing logic)
2. If new status == `ready`:
   - Parse `filament_id` and `grams_estimated` from the request body (new fields) OR from the order record (if pre-assigned)
   - Call `deduct_stock(order_id, filament_id, grams, user_id)`
   - If stock goes negative, log warning (no rollback)
3. If new status == `cancelled`:
   - Call `reverse_stock(order_id, user_id)`
4. Update `orders.status` (existing logic)
5. Send email (existing logic)

**Alternative considered and discarded:** Create a separate `POST /api/orders/{order_id}/stock/deduct` endpoint that must be called independently. Chosen: hook into the existing status endpoint because:
- Eliminates risk of operator error (forgetting to deduct)
- The atomic transaction guarantees consistency between status and stock
- Single API call is better UX

The request body for the status change is extended:

```json
{
  "status": "ready",
  "filament_id": "uuid",
  "grams": 150.00
}
```

The `filament_id` and `grams` are required when transitioning to `ready`, ignored for other transitions.

## Technical Decisions

**Chosen: Oversell is permitted (soft warning).**
Discarded alternative: hard block (409 Conflict) when stock is insufficient. Chosen: the business reality of 3D printing is that orders are small (50–200g), a new spool can be opened at any moment, and blocking the operator mid-workflow is worse than allowing oversell with a visible warning. Negative stock accurately reflects physical reality.

**Chosen: Hook into existing PATCH status endpoint.**
Discarded alternative: separate stock-deduction endpoint. Rationale above in "Integration" section.

**Chosen: `filament_id` and `grams` on the `orders` table.**
Discarded alternative: store these in a separate `order_filaments` junction table (for multi-filament future). Chosen: MVP simplicity. Multi-filament orders are rare in small-batch printing and will be a future feature.

**Chosen: `stock_movements` is immutable (no `updated_at`, no soft-delete).**
Discarded alternative: allow editing movements. Chosen: stock movements are an audit log. Corrections go through a new `adjustment` movement, never by mutating past records.

**Chosen: Supplies are tracked simply (quantity overwrite, no audit).**
Discarded alternative: full movement tracking for supplies. Chosen: supplies (alcohol, nozzles, tape) are low-value consumables that don't need audit. The effort isn't justified for MVP.

**Chosen: Soft-delete via `is_active` on filaments and supplies.**
Discarded alternative: hard `DELETE`. Chosen: FK integrity for `stock_movements` and the ability to restore accidentally archived records.

## Frontend

### New pages

#### `/dashboard/stock/filaments` — Filament list (R2, R9)

- Protected route
- Table with columns: Color swatch, Color name, Type, Weight, Price/kg, Low stock indicator (icon/chip), Actions
- Low stock rows highlighted with orange background (R9)
- "Add filament" button opens a create dialog/modal
- Each row has: [Edit] [Adjust Weight] [Archive]
- Clicking a row navigates to `/dashboard/stock/filaments/{id}`

#### `/dashboard/stock/filaments/[id]` — Filament detail

- Full filament info
- Stock movement history for this filament (paginated table)
- "Adjust Weight" action

#### `/dashboard/stock/supplies` — Supply list (R5, R9)

- Same pattern as filament list
- Table: Name, Quantity, Unit, Low stock indicator, Actions
- "Add supply" button

#### `/dashboard/stock/movements` — Stock movement log (R8)

- Paginated table: Date, Filament (color), Type (chip: consumption/reversal/adjustment), Quantity, Order ref, User
- Filters: movement type dropdown, filament selector, date range picker

### Updates to existing components

#### Order detail page `/dashboard/orders/[id]`

- If filament is assigned: show filament info (color swatch, name, type, grams estimated)
- When status is `ready`: require filament selection before the PUT (if not already assigned)
- When status is `cancelled`: show stock reversal info if applicable

#### Dashboard navigation

- Add "Stock" menu section with sub-items: Filaments, Supplies, Movements
- Show warning dot/badge if any low-stock items exist (from `GET /api/stock/low-stock`)

#### `api.ts` — New types

```typescript
interface Filament {
  id: string;
  color_name: string;
  color_hex: string;
  filament_type: string;
  weight_grams: number;
  price_per_kg: number;
  min_stock_warning_grams: number;
  is_active: boolean;
}

interface FilamentCreate { ... }
interface FilamentAdjust { delta_grams: number; notes?: string; }
interface Supply { ... }
interface StockMovement { ... }
interface LowStockResponse { filaments: Filament[]; supplies: Supply[]; }
```
