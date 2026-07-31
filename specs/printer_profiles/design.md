# Design — printer_profiles

## Tables (see `docs/data_model.md` for conventions)

### `printers` (new, created by this feature)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` | Multi-tenant |
| `name` | VARCHAR(120) | NOT NULL | Trimmed, min 1 char, e.g. "Ender 3 Pro" |
| `brand` | VARCHAR(100) | nullable | e.g. "Creality" |
| `model` | VARCHAR(100) | nullable | e.g. "Ender 3 Pro" |
| `nozzle_size_mm` | DECIMAL(5,2) | nullable | e.g. `0.40` |
| `bed_width_mm` | DECIMAL(8,2) | nullable | Build plate width in mm |
| `bed_depth_mm` | DECIMAL(8,2) | nullable | Build plate depth in mm |
| `bed_height_mm` | DECIMAL(8,2) | nullable | Max Z height in mm |
| `notes` | TEXT | nullable | Free text |
| `is_active` | BOOLEAN | NOT NULL, `DEFAULT true` | Soft-delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |

Indexes:
- `(user_id, is_active)` — filtered active printers per tenant (R2, R6)
- Partial unique: `UNIQUE (user_id, lower(name)) WHERE is_active` — one active
  name per tenant, case-insensitive; archived names become reusable (R7)

### `printer_maintenance` (new, created by this feature) — Append-only log

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `DEFAULT gen_random_uuid()` | |
| `user_id` | UUID | NOT NULL, FK → `users(id)` | Multi-tenant (see decision below) |
| `printer_id` | UUID | NOT NULL, FK → `printers(id)` | |
| `maintenance_type` | VARCHAR(20) | NOT NULL | Enum: `calibration`, `cleaning`, `repair` |
| `maintenance_date` | DATE | NOT NULL | When the work was performed |
| `description` | VARCHAR(500) | NOT NULL | What was done |
| `cost` | DECIMAL(12,2) | nullable, `CHECK (cost >= 0)` | `NULL` = free / not recorded |
| `created_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | Immutable — no `updated_at` |

Indexes:
- `(user_id, printer_id, maintenance_date DESC)` — history per printer (R12)
- `(printer_id)` — FK lookup

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `POST` | `/api/printers` | Required | Create printer (R1, R7, R8) |
| `GET` | `/api/printers` | Required | List active printers (R2, R6) |
| `GET` | `/api/printers/{printer_id}` | Required | Get single printer (R3, R6) |
| `PATCH` | `/api/printers/{printer_id}` | Required | Update printer (R4, R6, R7, R8) |
| `DELETE` | `/api/printers/{printer_id}` | Required | Soft-delete printer (R5, R6) |
| `POST` | `/api/printers/{printer_id}/maintenance` | Required | Add maintenance record (R9, R10, R11) |
| `GET` | `/api/printers/{printer_id}/maintenance` | Required | List maintenance for a printer (R12, R6) |

All routes are scoped to `current_user.id` via the existing `get_current_user`
dependency. Any request targeting a printer (or its maintenance) that does not
belong to the operator returns 404 — never 403, so existence is not leaked (R6).

### `POST /api/printers` — Request

```json
{
  "name": "Ender 3 Pro",
  "brand": "Creality",
  "model": "Ender 3 Pro",
  "nozzle_size_mm": 0.40,
  "bed_width_mm": 220.00,
  "bed_depth_mm": 220.00,
  "bed_height_mm": 250.00,
  "notes": "Main printer, PLA only"
}
```

Only `name` is required. Validation: trimmed name min length 1 (R8); duplicate
active name → 409 (R7).

### `POST /api/printers` — Response (201)

```json
{
  "id": "uuid",
  "name": "Ender 3 Pro",
  "brand": "Creality",
  "model": "Ender 3 Pro",
  "nozzle_size_mm": 0.40,
  "bed_width_mm": 220.00,
  "bed_depth_mm": 220.00,
  "bed_height_mm": 250.00,
  "notes": "Main printer, PLA only",
  "is_active": true,
  "created_at": "2026-07-31T10:00:00Z",
  "updated_at": "2026-07-31T10:00:00Z"
}
```

### `PATCH /api/printers/{printer_id}` — Request

Partial update, same shape as POST with all fields optional. Re-validates R7
and R8 against the resulting name.

### `DELETE /api/printers/{printer_id}` — Response (200)

```json
{
  "id": "uuid",
  "is_active": false
}
```

No hard delete — `is_active` set to `false`. Maintenance records are untouched.

### `POST /api/printers/{printer_id}/maintenance` — Request

```json
{
  "maintenance_type": "calibration",
  "maintenance_date": "2026-07-31",
  "description": "Z-offset recalibration after bed swap",
  "cost": 0.00
}
```

`cost` is optional (omit or `null`). Negative cost → 422 (R11). Unknown type → 422 (R10).

### `POST /api/printers/{printer_id}/maintenance` — Response (201)

```json
{
  "id": "uuid",
  "printer_id": "uuid",
  "maintenance_type": "calibration",
  "maintenance_date": "2026-07-31",
  "description": "Z-offset recalibration after bed swap",
  "cost": 0.00,
  "created_at": "2026-07-31T10:00:00Z"
}
```

### `GET /api/printers/{printer_id}/maintenance` — Response (200)

Array of maintenance records for the printer, ordered by `maintenance_date DESC`,
then `created_at DESC`. 404 if the printer does not exist or belongs to another user.

## Technical decisions

**Chosen: soft-delete via `is_active`, never hard `DELETE`.**
Discarded: hard delete. Chosen: `printer_maintenance` rows keep a FK to
`printers`; hard-deleting would either cascade away history or require
`ON DELETE SET NULL` and orphan the log. Consistent with the project-wide
soft-delete convention (filaments, products).

**Chosen: partial unique index `(user_id, lower(name)) WHERE is_active`.**
Discarded: plain unique `(user_id, name)`, and case-sensitive uniqueness.
Chosen: case-insensitive so "ender 3" vs "Ender 3" are caught as duplicates,
and partial-on-active so archiving a printer frees its name for reuse
(re-provisioning the same machine is a real solo-owner flow). The 409 is raised
in the service layer on top of the index so the error message is user-friendly.

**Chosen: explicit `user_id` on `printer_maintenance`.**
Discarded: inheriting the tenant only through `printer_id → printers.user_id`
(the `order_notes` pattern). Chosen: every maintenance query can be scoped
directly to the operator without a join, matching the `stock_movements` pattern,
and a mis-wired FK can never cross tenant boundaries even if the join is forgotten.

**Chosen: `printer_maintenance` is append-only (no `updated_at`, no edit/delete endpoint).**
Discarded: allowing edits and deletions of maintenance records. Chosen:
maintenance history is a log of what happened, like `stock_movements` — a
mistaken entry is corrected by adding a new record, never by rewriting the past.
Keeps the MVP surface smaller.

**Chosen: `maintenance_type` stored as VARCHAR with Pydantic `Literal` validation.**
Discarded: a PostgreSQL `ENUM` type. Chosen: adding a future maintenance type
(e.g. `upgrade`) becomes a one-line schema change instead of a DB migration.
Same pattern as `stock_movements.movement_type`.

**Chosen: `maintenance_date` as DATE, not TIMESTAMPTZ.**
Discarded: full timestamp. Chosen: a maintenance event has no time-of-day
meaning, and ordering by date is what the history table needs. Keeps the
frontend to a plain date input.

**Chosen: `nozzle_size_mm` and bed dimensions as explicit decimal columns.**
Discarded: a single `JSONB` "specs" blob. Chosen: these three-to-four values are
displayed as columns in the list table and will feed future budget/print-cost
math; explicit columns keep queries and sorting simple. JSONB stays reserved
for genuinely variable configs (e.g. slicer settings).

**Chosen: frontend uses a native date input (`TextField type="date"`), no date-picker library.**
Discarded: adding `@mui/x-date-pickers` + dayjs. Chosen: MVP needs only a date,
the native picker costs zero new dependencies, and the library can be added if a
date-range filter is ever needed.

## Frontend

### New pages

#### `/dashboard/printers` — Printer list (R13)

- Protected route, same pattern as `/dashboard/products`
- Table columns: Name, Brand, Model, Nozzle (mm), Bed size (`W × D × H` mm), Actions
- "Agregar impresora" button opens a create dialog (name, brand, model, nozzle,
  bed width/depth/height, notes)
- Each row: [Editar] [Archivar]; archive asks for confirmation, then calls `DELETE`
- Create/edit dialog disables submit while name is empty/whitespace (R13)
- Duplicate-name 409 from the API is shown inline as an error message
- Clicking a row navigates to `/dashboard/printers/{id}`

#### `/dashboard/printers/[id]` — Printer detail (R14)

- Full printer info (same fields as the dialog)
- Maintenance history table: Fecha, Tipo (chip: calibración/limpieza/reparación),
  Descripción, Costo
- "Agregar mantenimiento" dialog: date (native picker), type select, description,
  optional cost — rejects empty description, unknown type, and negative cost (R14)

### Dashboard navigation

- Add nav item "Impresoras" (icon, e.g. `ThreeDRotation` or `Print`) in the
  dashboard sidebar, new section "Equipo", following the existing `navItems`
  pattern in `src/app/dashboard/layout.tsx` (R13)

### `api.ts` — New types

```typescript
interface Printer {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  nozzle_size_mm: number | null;
  bed_width_mm: number | null;
  bed_depth_mm: number | null;
  bed_height_mm: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
interface PrinterCreate { name: string; brand?: string; ...; notes?: string; }
interface PrinterUpdate { name?: string; brand?: string; ...; notes?: string; }
interface MaintenanceRecord {
  id: string;
  printer_id: string;
  maintenance_type: 'calibration' | 'cleaning' | 'repair';
  maintenance_date: string;
  description: string;
  cost: number | null;
  created_at: string;
}
interface MaintenanceCreate { maintenance_type: ...; maintenance_date: string; description: string; cost?: number | null; }
```

API functions: `fetchPrinters`, `createPrinter`, `fetchPrinter`, `updatePrinter`,
`deletePrinter`, `fetchPrinterMaintenance`, `createPrinterMaintenance` —
wrapping the endpoints above, mirroring the existing `fetchProducts`/`createProduct`
implementations (TanStack Query v5 in the components, plain fetchers in `api.ts`).

## Data flow (Add maintenance record)

```
Operator → POST /api/printers/{id}/maintenance →
         → verify printer exists + user_id = current (else 404) →
         → validate type Literal + cost >= 0 (else 422) →
         → INSERT printer_maintenance (user_id, printer_id, ...) →
         → Return 201 with created record
```
