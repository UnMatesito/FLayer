# Tasks — printer_profiles

## Backend

### Database & Models

- [ ] Migration: `printers` table with `(user_id, is_active)` index and partial unique index on `(user_id, lower(name)) WHERE is_active` (R1, R2, R5, R7)
- [ ] Migration: `printer_maintenance` table with indexes (R9, R10, R11, R12)
- [ ] SQLAlchemy models: `Printer`, `PrinterMaintenance` (R1–R12)
- [ ] Pydantic schemas: `PrinterCreate`, `PrinterUpdate`, `PrinterResponse`, `MaintenanceCreate`, `MaintenanceResponse` (R1–R12)

### Printer CRUD Endpoints

- [ ] `GET /api/printers` — list active printers, scoped to current user, ordered by name ASC (R2, R6)
- [ ] `POST /api/printers` — create with validation: trimmed non-empty name, duplicate active name → 409 (R1, R7, R8)
- [ ] `GET /api/printers/{printer_id}` — get single printer, tenant-scoped 404 (R3, R6)
- [ ] `PATCH /api/printers/{printer_id}` — partial update, re-validate name rules + duplicate check, tenant-scoped 404 (R4, R6, R7, R8)
- [ ] `DELETE /api/printers/{printer_id}` — soft-delete (`is_active = false`), tenant-scoped 404, maintenance untouched (R5, R6)

### Maintenance Endpoints

- [ ] `POST /api/printers/{printer_id}/maintenance` — create record; tenant-scoped 404; type Literal validation; cost `>= 0` when present (R6, R9, R10, R11)
- [ ] `GET /api/printers/{printer_id}/maintenance` — list records ordered by `maintenance_date DESC, created_at DESC`; tenant-scoped 404 (R6, R12)

## Tests

- [ ] `test_create_printer_valid` (R1)
- [ ] `test_create_printer_optional_fields_null` — only name provided (R1)
- [ ] `test_list_printers_active_only` (R2)
- [ ] `test_list_printers_sorted_by_name` (R2 — extra)
- [ ] `test_get_printer_by_id_includes_inactive` (R3)
- [ ] `test_get_printer_by_id_not_found` (R3 — extra)
- [ ] `test_update_printer_fields` (R4)
- [ ] `test_update_printer_refreshes_updated_at` (R4 — extra)
- [ ] `test_soft_delete_printer` (R5)
- [ ] `test_soft_deleted_printer_hidden_from_list` (R5)
- [ ] `test_soft_delete_preserves_maintenance` (R5 — extra)
- [ ] `test_list_printers_only_own` (R6)
- [ ] `test_get_foreign_printer_404` (R6)
- [ ] `test_update_foreign_printer_404` (R6 — extra)
- [ ] `test_delete_foreign_printer_404` (R6 — extra)
- [ ] `test_duplicate_printer_name_409` (R7)
- [ ] `test_duplicate_name_case_insensitive_409` (R7 — extra)
- [ ] `test_duplicate_name_after_archive_allowed` (R7 — extra)
- [ ] `test_create_printer_empty_name_422` (R8)
- [ ] `test_update_printer_empty_name_422` (R8 — extra)
- [ ] `test_create_maintenance_valid` (R9)
- [ ] `test_maintenance_requires_existing_printer_404` (R9 — extra)
- [ ] `test_create_maintenance_foreign_printer_404` (R6, R9)
- [ ] `test_invalid_maintenance_type_422` (R10)
- [ ] `test_negative_maintenance_cost_422` (R11)
- [ ] `test_maintenance_without_cost_allowed` (R11 — extra)
- [ ] `test_list_maintenance_ordered_by_date_desc` (R12)
- [ ] `test_list_maintenance_foreign_printer_404` (R6, R12)

## Frontend

- [ ] Add `Printer`, `PrinterCreate`, `PrinterUpdate`, `MaintenanceRecord`, `MaintenanceCreate` types to `api.ts` (R13, R14)
- [ ] Add API functions to `api.ts`: `fetchPrinters`, `createPrinter`, `fetchPrinter`, `updatePrinter`, `deletePrinter`, `fetchPrinterMaintenance`, `createPrinterMaintenance` (R13, R14)
- [ ] Create `/dashboard/printers` page: table (name, brand, model, nozzle, bed size) + "Agregar impresora" dialog (R13)
- [ ] Add edit dialog and "Archivar" action with confirmation on list page (R13)
- [ ] Frontend name validation: submit disabled on empty/whitespace name; 409 shown inline (R7, R8, R13)
- [ ] Create `/dashboard/printers/[id]` detail page: printer info + maintenance history table (R14)
- [ ] Add "Agregar mantenimiento" dialog with date, type select, description, cost — validation matches backend (R10, R11, R14)
- [ ] Add "Impresoras" nav item (section "Equipo") to dashboard sidebar (`layout.tsx` `navItems`) (R13)

Estimated total: ~14h (backend 6h, tests 5h, frontend 3h)
