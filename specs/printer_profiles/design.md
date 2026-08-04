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
| `nozzle_sizes` | JSONB | NOT NULL, `DEFAULT '[]'` | Multiselect, e.g. `["0.2", "0.4"]` — presets 0.2/0.4/0.6/0.8 or custom decimal |
| `power_watts` | DECIMAL(7,2) | nullable, `CHECK (power_watts >= 0)` | Power consumption in W, e.g. `120.00` |
| `lifespan_hours` | DECIMAL(10,2) | nullable, `CHECK (lifespan_hours >= 0)` | Machine lifespan in hours, e.g. `4320.00` |
| `spare_parts_cost` | DECIMAL(12,2) | nullable, `CHECK (spare_parts_cost >= 0)` | Spare parts / machine cost, e.g. `400.00` |
| `image_url` | VARCHAR(500) | nullable | Remote image chosen via search (R17); `NULL` = fallback icon (R18) |
| `notes` | TEXT | nullable | Free text |
| `is_active` | BOOLEAN | NOT NULL, `DEFAULT true` | Soft-delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, `DEFAULT now()` | |

`power_watts`, `lifespan_hours`, `spare_parts_cost` map 1:1 to the
`generate_budget` region parameters `machine_wattage`, `machine_lifespan_hours`,
`machine_cost` (see `specs/generate_budget/design.md` "Hardcoded defaults").
Bed dimensions are intentionally absent — they were never used by any formula.

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
| `POST` | `/api/printers` | Required | Create printer (R1, R7, R8, R15, R16) |
| `GET` | `/api/printers` | Required | List active printers (R2, R6) |
| `GET` | `/api/printers/{printer_id}` | Required | Get single printer (R3, R6) |
| `PATCH` | `/api/printers/{printer_id}` | Required | Update printer (R4, R6, R7, R8, R15, R16) |
| `DELETE` | `/api/printers/{printer_id}` | Required | Soft-delete printer (R5, R6) |
| `POST` | `/api/printers/{printer_id}/maintenance` | Required | Add maintenance record (R9, R10, R11) |
| `GET` | `/api/printers/{printer_id}/maintenance` | Required | List maintenance for a printer (R12, R6) |
| `GET` | `/api/printers/catalog` | Required | Brand/model catalog for the selects (R20) |

All routes are scoped to `current_user.id` via the existing `get_current_user`
dependency. Any request targeting a printer (or its maintenance) that does not
belong to the operator returns 404 — never 403, so existence is not leaked (R6).

### `POST /api/printers` — Request

```json
{
  "name": "Ender 3 Pro",
  "brand": "Creality",
  "model": "Ender 3 Pro",
  "nozzle_sizes": ["0.2", "0.4"],
  "power_watts": 120.00,
  "lifespan_hours": 4320.00,
  "spare_parts_cost": 400.00,
  "image_url": "https://commons.wikimedia.org/w/thumb.php/...",
  "notes": "Main printer, PLA only"
}
```

Only `name` is required. Validation: trimmed name min length 1 (R8); duplicate
active name → 409 (R7); nozzle list rules (R15); non-negative `power_watts`,
`lifespan_hours`, `spare_parts_cost` (R16); `image_url` must be a valid
http/https URL of max 500 chars when present, `null` = fallback icon (R17, R18).

### `POST /api/printers` — Response (201)

```json
{
  "id": "uuid",
  "name": "Ender 3 Pro",
  "brand": "Creality",
  "model": "Ender 3 Pro",
  "nozzle_sizes": ["0.2", "0.4"],
  "power_watts": 120.00,
  "lifespan_hours": 4320.00,
  "spare_parts_cost": 400.00,
  "image_url": "https://commons.wikimedia.org/w/thumb.php/...",
  "notes": "Main printer, PLA only",
  "is_active": true,
  "created_at": "2026-07-31T10:00:00Z",
  "updated_at": "2026-07-31T10:00:00Z"
}
```

### `PATCH /api/printers/{printer_id}` — Request

Partial update, same shape as POST with all fields optional. Re-validates R7,
R8, R15, and R16 against the resulting printer.

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

### `GET /api/printers/catalog` (R20)

Auth required. Serves the curated brand/model catalog as a constant defined in
the backend (`backend/services/printer_catalog.py`). Response:

```json
{
  "brands": [
    { "brand": "Bambu Lab", "models": ["A1", "A1 Mini", "P1S", "P1P", "X1 Carbon", "X1E", "H2D", "H2C", "H2S", "A2L", "P2S", "X2D"] },
    { "brand": "Creality", "models": ["Ender 3", "Ender 3 Pro", "Ender 3 Max", "Ender 3 V2", "Ender 3 S1", "Ender 3 V3 SE", "Ender 3 V3 KE", "K1", "K1C", "K1 Max", "K2 Plus", "CR-10", "SPARKX i7", "K2", "K2 Plus", "K2 Pro", "K2 SE", "K1 SE", "Ender 3 V4", "HI", "Ender 5", "Ender 5 Pro", "Ender 5 Plus", "Ender 5 Max", "Ender 3 V3 Plus", "Ender 3 V3", "Ender 3 S1 Plus", "Ender 3 S1 Pro", "Ender 3 Neo", "Ender 3 V2 Neo", "Ender 3 Max Neo"] },
    { "brand": "Prusa", "models": ["MK3S+", "MK4", "MK4S", "Mini+", "XL", "Core One", "Core One+", "Core One L", "HT90"] },
    { "brand": "Anycubic", "models": ["Kobra 2", "Kobra 2 Pro", "Kobra 2 Neo", "Kobra 2 Max", "Kobra 3", "Kobra 3 V2", "Kobra 3 Max", "Kobra Neo", "Kobra Go", "Kobra X", "Chiron", "Kobra S1", "Kobra S1 Max", "Kobra 4"] },
    { "brand": "Elegoo", "models": ["Neptune 3", "Neptune 3 Pro", "Neptune 3 Plus", "Neptune 3 Max", "Neptune 4", "Neptune 4 Pro", "Neptune 4 Plus", "Neptune 4 Max", "Centauri Carbon", "Centauri Carbon 2", "Orange Storm Giga"] },
    { "brand": "Artillery", "models": ["Sidewinder X1", "Sidewinder X2", "Sidewinder X3 Plus", "Genius", "Hornet", "M1 Pro", "M1 Pro S1", "Sidewinder X4 Pro", "Sidewinder X4 Pro S1", "Sidewinder X4 Plus"] },
    { "brand": "Flashforge", "models": ["Adventurer 3", "Adventurer 4", "Adventurer 5M", "Creator Pro", "Guider 3", "Creator 5", "Adeventurer 5X", "Adventurer 5M Pro"] },
    { "brand": "Sovol", "models": ["SV01", "SV01 Pro", "SV06", "SV06 Plus", "SV06 ACE", "SV07", "SV08", "SV08 Max", "Zero", "Comgrow T300", "Comgrow T500", "SV02", "SV03", "SV04", "SV05", "SV07 Plus"] },
    { "brand": "Qidi Tech", "models": ["Q1 Pro", "X-Plus", "X-Max", "X-CF Pro"] },
    { "brand": "FLSUN", "models": ["Q5", "V400", "Super Racer", "T1", "T1 Pro", "T1 Max", "V400 Max", "S1 Pro"] },
  ]
}
```

The catalog is informational only — the backend never validates `brand`/`model`
against it, so custom values are always accepted. Extending the catalog is a
one-line-per-brand change to the constant.

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

**Chosen: `nozzle_sizes` as a JSONB array of strings, not a child table or a single column.**
Discarded: a single `nozzle_size_mm` decimal — a printer has multiple nozzles,
so a scalar cannot represent them. Discarded: a `printer_nozzles` child table —
the MVP never queries per-nozzle, and a JSONB array matches the variable-config
convention (`budgets.filament_items`, same `NOT NULL DEFAULT '[]'` pattern).
Stored as strings so `"0.2"` round-trips exactly. The service validates each
entry: presets `0.2`, `0.4`, `0.6`, `0.8` are always accepted, any other value
is accepted only if it is a positive decimal (custom nozzle); duplicates are
rejected (R15).

**Chosen: machine parameters as explicit decimal columns, migrated from the `generate_budget` region parameters.**
Discarded: keeping them only in `budget_parameters` / hardcoded defaults.
Chosen: `power_watts`, `lifespan_hours`, `spare_parts_cost` map 1:1 to the
`generate_budget` hardcoded machine params (`machine_wattage`, `machine_cost`,
`machine_lifespan_hours` — the "Spare parts / machine cost" line in the region
parameters), so each printer carries its own machine math inputs. The budget
service keeps its hardcoded defaults until budget calculation is wired to a
specific printer (future feature — see `generate_budget` R11). Bed dimensions
were dropped: they exist in no formula.

**Chosen: printer image as an optional manually-pasted URL.**
Discarded: automatic image search — both a Wikimedia Commons proxy and
per-manufacturer site scraping (e.g. `us.store.bambulab.com`). Manufacturer
stores run heterogeneous platforms (custom Next.js for Bambu, Shopify for some
others, WooCommerce/custom elsewhere), so "search the manufacturer" means one
fragile HTML scraper per brand that breaks on any site redesign, and
anti-bot/hotlink protection is a real risk. A Commons proxy adds a moving
external dependency for an optional decorative field. Chosen: the operator
pastes an image URL (http/https, ≤ 500 chars) in the dialog, sees a live
preview, and can clear it — the Maker is the one who knows which photo/render
of their machine is right, and the fallback icon (R18) covers "no image"
cleanly. Transparency of the pasted image is the operator's choice, not
something a backend can enforce. MVP stays fully offline-testable and
deterministic.

**Chosen: store the remote URL, do not download the image.**
Discarded: downloading the image into the app's `uploads/` storage. Chosen:
`image_url` stores the pasted URL; the fallback icon covers any future broken
link gracefully. Download-and-store (like `product_management` uploads) adds
storage and sync complexity without MVP value.

**Chosen: fallback FDM printer icon as a custom SVG component.**
Discarded: MUI `Print` icon (generic office printer, not an FDM machine).
Chosen: a new `PrinterIcon` SVG component in the `FilamentIcon` style — a
frame-printed FDM silhouette — used everywhere a printer has no `image_url`
(R18).

**Chosen: curated brand/model catalog as a backend constant + endpoint.**
Discarded: a database table, and a frontend-only constant. Discarded: a DB
table — the catalog is read-only reference data with no per-tenant or
relational needs; a table would need seeding, migrations, and admin UI for
zero gain. Discarded: frontend-only constant — the catalog would diverge from
any future backend use (validation, reports). Chosen: a Python constant served
by `GET /api/printers/catalog`; the backend never validates against it, so the
freeSolo custom-entry flow (R20) works and the spec's "brand and model are
plain optional text" contract is unchanged. Extending the list is a one-line
change in one file.

**Chosen: frontend uses a native date input (`TextField type="date"`), no date-picker library.**
Discarded: adding `@mui/x-date-pickers` + dayjs. Chosen: MVP needs only a date,
the native picker costs zero new dependencies, and the library can be added if a
date-range filter is ever needed.

## Frontend

### New pages

#### `/dashboard/printers` — Printer list (R13)

- Protected route, card grid in the same style as `/dashboard/products`
  (MUI `Card` + responsive `Grid`, hover elevation/translate effect)
- Each card: image area (the printer image, or the `PrinterIcon` fallback when
  `image_url` is null), name (bold), brand · model, nozzle chips, and the
  machine params as small labeled rows (Power W, Lifespan h, Spare parts cost)
- Card actions row: [Editar] [Archivar]; archive asks for confirmation, then
  calls `DELETE`; clicking the card (not the buttons) navigates to
  `/dashboard/printers/{id}`
- "Agregar impresora" button opens a create dialog (name, brand, model, nozzle
  multiselect, power watts, lifespan hours, spare parts cost, image URL, notes)
- Brand/model selects (R20): both are MUI `Autocomplete` with `freeSolo`,
  populated from `GET /api/printers/catalog` (fetched once and cached with
  TanStack Query). The model select's options are the models of the selected
  brand; changing the brand clears the model. Custom values can be typed in
  either field (free text, same validation as before: trimmed, ≤ 100 chars)
- Nozzle multiselect: MUI `Autocomplete` with `multiple` + `freeSolo` — preset
  options `0.2` / `0.4` / `0.6` / `0.8`, and the operator can type a custom
  size; rendered as chips
- Image URL input (R17): a "Imagen (URL)" text field in the dialog, optional;
  live preview of the pasted URL rendered next to the field (broken URL or
  empty → fallback icon); a "Quitar imagen" action clears the field
- Each row: [Editar] [Archivar]; archive asks for confirmation, then calls `DELETE`
- Create/edit dialog disables submit while name is empty/whitespace (R13)
- Duplicate-name 409 from the API is shown inline as an error message
- Clicking a row navigates to `/dashboard/printers/{id}`

#### `/dashboard/printers/[id]` — Printer detail (R14)

- Full printer info (same fields as the dialog) with the printer image or the
  fallback FDM icon at the top (R18, R19)
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
  nozzle_sizes: string[];
  power_watts: number | null;
  lifespan_hours: number | null;
  spare_parts_cost: number | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
interface PrinterCreate { name: string; brand?: string; model?: string; nozzle_sizes?: string[]; power_watts?: number; lifespan_hours?: number; spare_parts_cost?: number; image_url?: string; notes?: string; }
interface PrinterUpdate { name?: string; brand?: string; model?: string; nozzle_sizes?: string[]; power_watts?: number; lifespan_hours?: number; spare_parts_cost?: number; image_url?: string; notes?: string; }
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

New component `src/components/PrinterIcon.tsx` — custom FDM printer SVG in the
`FilamentIcon` style, used as the image fallback everywhere a printer has no
`image_url` (list rows, detail page, dialog preview).

## Data flow (Add maintenance record)

```
Operator → POST /api/printers/{id}/maintenance →
         → verify printer exists + user_id = current (else 404) →
         → validate type Literal + cost >= 0 (else 422) →
         → INSERT printer_maintenance (user_id, printer_id, ...) →
         → Return 201 with created record
```
