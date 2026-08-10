# Implementation — printer_profiles

Started 2026-07-31 by implementer. Feature: printer profiles + maintenance log, full-stack (backend API, 41 tests, 2 frontend pages + shared components).

## Files modified

- `src/alembic/versions/012_create_printer_tables.py` (NEW) — `printers` + `printer_maintenance` tables, indexes, partial unique index `(user_id, lower(name)) WHERE is_active`, CHECK constraints; chained on `46ac01109cd2` (true head — repo had a pre-existing branch)
- `src/backend/models/printer.py` (NEW) — `Printer`, `PrinterMaintenance` (SQLAlchemy 2.0, JSONB, DECIMAL, CheckConstraint + Index in `__table_args__` mirroring the migration)
- `src/backend/models/__init__.py` — register new models
- `src/backend/schemas/printer.py` (NEW) — `PrinterCreate`, `PrinterUpdate`, `PrinterResponse`, `MaintenanceCreate`, `MaintenanceResponse`; name trim/min-1, brand/model ≤100 trim-to-null, image_url http(s)/≤500, non-negative machine params, `Literal` maintenance type
- `src/backend/services/printer_service.py` (NEW) — `validate_nozzle_sizes`: presets 0.2/0.4/0.6/0.8 or positive decimal, no duplicates, input order preserved
- `src/backend/services/printer_catalog.py` (NEW) — `PRINTER_CATALOG` constant (10 brands) + `get_printer_catalog()`
- `src/backend/api/printers.py` (NEW) — 8 endpoints, tenant-scoped 404, duplicate-name 409, `/catalog` registered before `/{printer_id}`
- `src/backend/main.py` — include printers router
- `src/alembic/env.py` — import new models
- `src/tests/factories/printer_factory.py` (NEW) — `PrinterFactory`, `PrinterMaintenanceFactory`
- `src/tests/fixtures/printers.py` (NEW) — `test_printer`, `test_inactive_printer`, `other_user`
- `src/tests/conftest.py` — register printers fixtures plugin
- `src/tests/integration/test_printers.py` (NEW) — 41 tests
- `src/frontend/src/app/api.ts` — `Printer`/`PrinterCreate`/`PrinterUpdate`/`MaintenanceRecord`/`MaintenanceCreate`/`PrinterCatalog` types + `fetchPrinters`, `createPrinter`, `fetchPrinter`, `updatePrinter`, `deletePrinter`, `fetchPrinterMaintenance`, `createPrinterMaintenance`, `fetchPrinterCatalog`
- `src/frontend/src/components/PrinterIcon.tsx` (NEW) — custom FDM printer SVG (FilamentIcon style)
- `src/frontend/src/components/PrinterImage.tsx` (NEW) — image-or-fallback rendering, broken URL → fallback icon
- `src/frontend/src/components/PrinterFormDialog.tsx` (NEW) — shared create/edit dialog: freeSolo brand/model Autocompletes (catalog via TanStack Query, brand change clears model), multiple+freeSolo nozzle Autocomplete with preset chips, machine params, image URL + live preview + "Quitar imagen", inline 409, submit disabled on empty name
- `src/frontend/src/app/dashboard/printers/page.tsx` (NEW) — card grid + create/edit dialog + archive with confirm
- `src/frontend/src/app/dashboard/printers/[id]/page.tsx` (NEW) — detail + maintenance history table + "Agregar mantenimiento" dialog
- `src/frontend/src/app/dashboard/layout.tsx` — "Impresoras" nav item, section "Equipo"

## Traceability R<n> → test

- R1 ← test_create_printer_valid, test_create_printer_optional_fields_null
- R2 ← test_list_printers_active_only, test_list_printers_sorted_by_name
- R3 ← test_get_printer_by_id_includes_inactive, test_get_printer_by_id_not_found
- R4 ← test_update_printer_fields, test_update_printer_refreshes_updated_at
- R5 ← test_soft_delete_printer, test_soft_deleted_printer_hidden_from_list, test_soft_delete_preserves_maintenance
- R6 ← test_list_printers_only_own, test_get_foreign_printer_404, test_update_foreign_printer_404, test_delete_foreign_printer_404, test_create_maintenance_foreign_printer_404, test_list_maintenance_foreign_printer_404
- R7 ← test_duplicate_printer_name_409, test_duplicate_name_case_insensitive_409, test_duplicate_name_after_archive_allowed
- R8 ← test_create_printer_empty_name_422, test_update_printer_empty_name_422
- R9 ← test_create_maintenance_valid, test_maintenance_requires_existing_printer_404
- R10 ← test_invalid_maintenance_type_422
- R11 ← test_negative_maintenance_cost_422, test_maintenance_without_cost_allowed
- R12 ← test_list_maintenance_ordered_by_date_desc
- R13–R19 (UI) ← `pnpm build` type-check + manual API verification below (UI pages exercised at build; browser walk-through left for human)
- R15 ← test_nozzle_sizes_presets_and_custom_accepted, test_nozzle_sizes_empty_allowed, test_duplicate_nozzle_sizes_422, test_invalid_nozzle_size_422
- R16 ← test_negative_power_watts_422, test_negative_lifespan_hours_422, test_negative_spare_parts_cost_422
- R17/R19 ← test_create_printer_with_image_url, test_update_printer_image_url, test_printer_image_url_invalid_422
- R20 ← test_get_printer_catalog, test_get_printer_catalog_requires_auth, test_create_printer_custom_brand_model_accepted

## Manual verification

- [x] `alembic upgrade head` / `downgrade 011` / `upgrade head` all clean, single head (012)
- [x] API smoke test against dev DB (uvicorn): catalog → 10 brands; create printer → 201 with id; maintenance create → 201; duplicate name → 409; duplicate nozzles → 422; DELETE → `is_active: false`; smoke rows cleaned afterwards
- [x] `pnpm build` — compiles, TypeScript passes, both new routes present
- [x] Docker services: `postgres`, `postgres_test`, `mailpit` up (mailpit was the cause of the 10 pre-existing test failures — with it running, all 94 baseline tests pass)

Note: `pnpm lint` and `./init.sh` are broken at repo level, pre-existing and unrelated:
- `next lint` script + eslint config miss `@eslint/eslintrc` (missing dependency in package.json)
- `init.sh` fails on cancelled `arquiminis` feature (specs removed but still non-pending in `feature_list.json` — human decision 2026-07-31)

## pytest --cov result

```
backend/api/printers.py       76      0   100%
backend/models/printer.py     34      0   100%
backend/schemas/printer.py   153     11    93%
backend/services/printer_catalog.py  3   0   100%
backend/services/printer_service.py 21   1    95%
TOTAL                       2015    272    87%
135 passed in 4.06s
```

(94 baseline + 41 new; every touched file > 70% coverage)

---

## R11 — generate_budget printer profile integration (2026-07-31)

All `[ ]` tasks in `specs/generate_budget/tasks.md` completed (0 remaining). Backend + frontend + 8 tests.

### Files modified

- `src/alembic/versions/013_add_printer_snapshot_to_budgets.py` (NEW) — `budgets.printer_id` (FK → `printers`, indexed) + NULLable snapshot columns `power_watts`/`lifespan_hours`/`spare_parts_cost` with CHECK >= 0; chained on `012`; single head `013`; upgrade/downgrade cycle verified
- `src/backend/models/budget.py` — snapshot columns + `printer_id` FK + `printer` relationship (`lazy="noload"`, never lazy-loads in async) + CHECK constraints mirroring migration
- `src/backend/schemas/budget.py` — optional `printer_id` on `BudgetCreate`/`BudgetUpdate`/`BudgetPreviewRequest`; `printer_id`, `printer_name`, `power_watts`, `lifespan_hours`, `spare_parts_cost` on `BudgetResponse`
- `src/backend/services/budget_service.py` — `resolve_machine_params(printer, currency)` with per-field fallback to currency defaults; `calculate_breakdown` accepts resolved `power_watts`/`lifespan_hours`/`spare_parts_cost` (None → defaults) and returns them; `calculate_create`/`calculate_preview` pass-through
- `src/backend/api/budget.py` — tenant-scoped `_get_own_printer_or_404` (foreign/nonexistent → 404); POST persists `printer_id` + resolved snapshot (NULL snapshots when no printer); GET joins printer name via `_get_printer_name`; PUT re-snapshots when `printer_id` present (uses `model_fields_set` so `null` clears) and reuses budget snapshots when only items change; preview resolves params without persisting; read-time breakdown recomputes from snapshots
- `src/tests/integration/test_budget.py` — `TestBudgetPrinterProfile` with 8 R11 tests
- `src/frontend/src/app/api.ts` — `printer_id` on `BudgetCreate`/`BudgetUpdate`, 5 new fields on `BudgetResponse`
- `src/frontend/src/components/BudgetForm.tsx` — "Impresora" select (active printers from `fetchPrinters`, "Sin impresora" default) next to currency selector; sends `printer_id`; preview shows printer name + machine params
- `src/frontend/src/components/BudgetBreakdown.tsx` — "Máquina" block: printer name (or "parámetros por defecto") + watts/lifespan/spare parts (currency-aware defaults when snapshot NULL)

### Traceability R11 → test

- R11 ← test_create_budget_with_printer_profile (params loaded + snapshotted to DB row)
- R11 (defaults) ← test_create_budget_without_printer_uses_defaults
- R11 (per-field fallback) ← test_create_budget_printer_partial_fields_fallback
- R11 (404 foreign) ← test_create_budget_foreign_printer_404
- R11 (404 nonexistent) ← test_create_budget_nonexistent_printer_404
- R11 (snapshot immutability) ← test_budget_snapshot_immutable
- R11 (preview) ← test_preview_with_printer_profile
- R11 (GET name + params) ← test_get_budget_returns_printer_name
- R11 (UI) ← `pnpm build` type-check + live API smoke (below)

### Manual verification

- [x] `alembic upgrade head` from 012, `downgrade 012`, `upgrade head` — clean, single head (013)
- [x] Live API smoke against dev DB (uvicorn :8010): create printer (250W/1000h/$20000) → budget create 201 with `power_watts=250`, electricity 70.00, amortization 40.00 (matches hand calc: 2h × 0.25kW × 140 + 2h × 20000/1000); GET returns `printer_name` + snapshots; preview uses printer params, nothing persisted; nonexistent printer → 404; smoke rows cleaned
- [x] `pnpm exec tsc --noEmit` + `pnpm build` — clean

### pytest --cov result (touched files)

```
backend/api/budget.py                   143     21    85%
backend/models/budget.py                 33      0   100%
backend/schemas/budget.py               223     57    74%
backend/services/budget_service.py       71      7    90%
TOTAL                                  2071    283    86%
143 passed in 4.81s
```

No commit made (per instructions).

---

## R11 review follow-up (2026-07-31)

Addressed both rejection items from `progress/review_budget_r11.md`.

### 1. PUT `printer_id` re-snapshot tests (was: no test)

- `src/tests/integration/test_budget.py` — new `TestUpdateBudgetPrinterProfile` class (4 tests):
  - `test_update_budget_changes_printer_resnapshots` — switch printer via PUT → new params in breakdown + row (previously uncovered lines)
  - `test_update_budget_clears_printer` — `printer_id: null` → snapshots NULL, defaults used (33.6/69.44)
  - `test_update_budget_items_only_keeps_snapshot` — items-only PUT keeps original snapshot
  - `test_update_budget_final_price_recalculated_on_partial_update` — regression for bug #2 (hours/extra_costs/manual_price-only PUTs)

### 2. Stale `final_price` on partial PUT (bug, was report-only)

- `src/backend/api/budget.py` — `recalc_needed` was `body.filament_items is not None or printer_id_changed`; a PUT changing only `hours`/`minutes`/`extra_costs`/`manual_price` (etc.) skipped recalc: `budget.final_price` stayed stale in the DB while the response/GET recomputed the breakdown. Fix: new `CALC_AFFECTING_FIELDS` frozenset (`filament_items`, `printer_id`, `manual_filament_cost`, `hours`, `minutes`, `extra_costs`, `margin_type`, `manual_price`, `currency`); `recalc_needed = bool(body.model_fields_set & CALC_AFFECTING_FIELDS)`. Verified RED first (test failed against old gate), then GREEN.

### Verification

- `pytest --cov` — 147 passed (143 + 4 new); `backend/api/budget.py` 85% → 94% (8 uncovered = minor branches: 404 helper, notes/currency/minutes-only assignments, no-recalc fallback)
- `pnpm exec tsc --noEmit` + `pnpm build` — clean
- `specs/generate_budget/tasks.md` — both PUT task lines kept `[x]` with review-follow-up annotation; 4 new test tasks added as `[x]`

No commit made (per instructions).

## Review follow-up (2026-08-04) — recommended changes implemented

Both non-blocking notes from `progress/review_printer_profiles.md` fixed:

1. **Non-finite nozzle sizes** — `validate_nozzle_sizes` now rejects `NaN`,
   `Infinity`, `-Infinity` via `value.is_finite()` (was: uncaught
   `InvalidOperation` → 500 for `"NaN"`, `"Infinity"` accepted as custom size).
2. **Brand/model length** — `brand_model_optional` (both `PrinterCreate` and
   `PrinterUpdate`) enforces ≤100 chars after trim → clean 422 (was: DB
   `VARCHAR(100)` overflow → 500).

New tests in `src/tests/integration/test_printers.py`:
`test_non_finite_nozzle_size_422`, `test_brand_model_too_long_422`,
`test_brand_model_exactly_100_chars_accepted`,
`test_update_brand_model_too_long_422`.

### Verification

- `pytest tests/` — **151 passed** (147 + 4 new)
- Coverage: `printer_service.py` 95%, `schemas/printer.py` 93%

## Reviewer verdict

APPROVED — full traceability R1–R20, 70/70 tasks `[x]`, 135 tests at review
time (2026-07-31), coverage > 70% on all touched files. Review produced 2
non-blocking recommended changes (non-finite nozzles, brand/model length) —
both implemented and verified on 2026-08-04 (see "Review follow-up" above),
151/151 tests. Review doc eliminated 2026-08-04 per the new rule: review
docs exist only when they contain recommended changes.
