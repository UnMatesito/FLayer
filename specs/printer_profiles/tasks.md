# Tasks — printer_profiles

## Backend

### Database & Models

- [x] Migration: `printers` table (`nozzle_sizes` JSONB, `power_watts`, `lifespan_hours`, `spare_parts_cost`, `image_url`, no bed columns) with `(user_id, is_active)` index and partial unique index on `(user_id, lower(name)) WHERE is_active` (R1, R2, R5, R7, R15, R16)
- [x] Migration: `printer_maintenance` table with indexes (R9, R10, R11, R12)
- [x] SQLAlchemy models: `Printer`, `PrinterMaintenance` (R1–R19)
- [x] Pydantic schemas: `PrinterCreate`, `PrinterUpdate`, `PrinterResponse`, `MaintenanceCreate`, `MaintenanceResponse` (R1–R19)
- [x] Nozzle list validation in service: presets `0.2`/`0.4`/`0.6`/`0.8` or positive decimal, no duplicates (R15)
- [x] Machine parameters validation: `power_watts`, `lifespan_hours`, `spare_parts_cost` non-negative (R16)
- [x] `image_url` in schemas: optional, http/https URL, max 500 chars, null = fallback icon (R17, R18)
- [x] `printer_catalog.py` constant: curated brands + models, extensible (R20)
- [x] `GET /api/printers/catalog` endpoint — auth required, serves the catalog constant (R20)

### Printer CRUD Endpoints

- [x] `GET /api/printers` — list active printers, scoped to current user, ordered by name ASC (R2, R6)
- [x] `POST /api/printers` — create with validation: trimmed non-empty name, duplicate active name → 409 (R1, R7, R8)
- [x] `GET /api/printers/{printer_id}` — get single printer, tenant-scoped 404 (R3, R6)
- [x] `PATCH /api/printers/{printer_id}` — partial update, re-validate name rules + duplicate check, tenant-scoped 404 (R4, R6, R7, R8)
- [x] `DELETE /api/printers/{printer_id}` — soft-delete (`is_active = false`), tenant-scoped 404, maintenance untouched (R5, R6)

### Maintenance Endpoints

- [x] `POST /api/printers/{printer_id}/maintenance` — create record; tenant-scoped 404; type Literal validation; cost `>= 0` when present (R6, R9, R10, R11)
- [x] `GET /api/printers/{printer_id}/maintenance` — list records ordered by `maintenance_date DESC, created_at DESC`; tenant-scoped 404 (R6, R12)

## Tests

- [x] `test_create_printer_valid` (R1)
- [x] `test_create_printer_optional_fields_null` — only name provided (R1)
- [x] `test_list_printers_active_only` (R2)
- [x] `test_list_printers_sorted_by_name` (R2 — extra)
- [x] `test_get_printer_by_id_includes_inactive` (R3)
- [x] `test_get_printer_by_id_not_found` (R3 — extra)
- [x] `test_update_printer_fields` — including nozzle list + machine params (R4)
- [x] `test_update_printer_refreshes_updated_at` (R4 — extra)
- [x] `test_nozzle_sizes_presets_and_custom_accepted` — `["0.2", "0.4", "0.6", "0.8", "1.0"]` (R15)
- [x] `test_nozzle_sizes_empty_allowed` (R15 — extra)
- [x] `test_duplicate_nozzle_sizes_422` (R15)
- [x] `test_invalid_nozzle_size_422` — non-numeric or non-positive (R15)
- [x] `test_negative_power_watts_422` (R16)
- [x] `test_negative_lifespan_hours_422` (R16)
- [x] `test_negative_spare_parts_cost_422` (R16)
- [x] `test_create_printer_with_image_url` — persists `image_url` (R17)
- [x] `test_update_printer_image_url` — set / clear `image_url` (R17, R19)
- [x] `test_printer_image_url_invalid_422` — not http/https, or > 500 chars (R17)
- [x] `test_get_printer_catalog` — returns brands with models, expected brands present (R20)
- [x] `test_get_printer_catalog_requires_auth` (R20)
- [x] `test_create_printer_custom_brand_model_accepted` — free text not in catalog is fine (R20)
- [x] `test_soft_delete_printer` (R5)
- [x] `test_soft_deleted_printer_hidden_from_list` (R5)
- [x] `test_soft_delete_preserves_maintenance` (R5 — extra)
- [x] `test_list_printers_only_own` (R6)
- [x] `test_get_foreign_printer_404` (R6)
- [x] `test_update_foreign_printer_404` (R6 — extra)
- [x] `test_delete_foreign_printer_404` (R6 — extra)
- [x] `test_duplicate_printer_name_409` (R7)
- [x] `test_duplicate_name_case_insensitive_409` (R7 — extra)
- [x] `test_duplicate_name_after_archive_allowed` (R7 — extra)
- [x] `test_create_printer_empty_name_422` (R8)
- [x] `test_update_printer_empty_name_422` (R8 — extra)
- [x] `test_create_maintenance_valid` (R9)
- [x] `test_maintenance_requires_existing_printer_404` (R9 — extra)
- [x] `test_create_maintenance_foreign_printer_404` (R6, R9)
- [x] `test_invalid_maintenance_type_422` (R10)
- [x] `test_negative_maintenance_cost_422` (R11)
- [x] `test_maintenance_without_cost_allowed` (R11 — extra)
- [x] `test_list_maintenance_ordered_by_date_desc` (R12)
- [x] `test_list_maintenance_foreign_printer_404` (R6, R12)

## Frontend

- [x] Add `Printer`, `PrinterCreate`, `PrinterUpdate`, `MaintenanceRecord`, `MaintenanceCreate` types to `api.ts` (R13, R14)
- [x] Add `image_url` to `Printer`/`PrinterCreate`/`PrinterUpdate`; add `PrinterCatalog` type and `fetchPrinterCatalog()` to `api.ts` (R17, R20)
- [x] Create `PrinterIcon` component — custom FDM printer SVG, `FilamentIcon` style (R18)
- [x] Add API functions to `api.ts`: `fetchPrinters`, `createPrinter`, `fetchPrinter`, `updatePrinter`, `deletePrinter`, `fetchPrinterMaintenance`, `createPrinterMaintenance` (R13, R14)
- [x] Create `/dashboard/printers` page: card grid (image or `PrinterIcon`, name, brand · model, nozzle chips, power, lifespan, spare parts cost) + "Agregar impresora" dialog, products-page card style (R13, R18, R19)
- [x] Brand/model selects in dialog: `Autocomplete` `freeSolo` from catalog; model options depend on selected brand; brand change clears model; custom values typed freely (R20)
- [x] Nozzle multiselect in create/edit dialog: `Autocomplete` `multiple` + `freeSolo` with presets `0.2`/`0.4`/`0.6`/`0.8`, custom values typed freely, rendered as chips (R13, R15)
- [x] Image URL field in create/edit dialog: optional text input with live preview (broken/empty URL → fallback icon), "Quitar imagen" action (R17, R19)
- [x] Add edit dialog and "Archivar" action with confirmation on list page (R13)
- [x] Frontend name validation: submit disabled on empty/whitespace name; 409 shown inline (R7, R8, R13)
- [x] Create `/dashboard/printers/[id]` detail page: printer info + image/fallback icon + maintenance history table (R14, R18, R19)
- [x] Add "Agregar mantenimiento" dialog with date, type select, description, cost — validation matches backend (R10, R11, R14)
- [x] Add "Impresoras" nav item (section "Equipo") to dashboard sidebar (`layout.tsx` `navItems`) (R13)

Estimated total: ~18h (backend 7.5h, tests 6.5h, frontend 4h)
