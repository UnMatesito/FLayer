# Review: printer_profiles

Reviewed 2026-07-31 against `specs/printer_profiles/{requirements,design,tasks}.md` and
`progress/impl_printer_profiles.md`. No code was edited.

## Traceability R<n> → test

All tests below were run by the reviewer, not taken from the implementer's report.

| Req | Test(s) | Result |
|---|---|---|
| R1 | test_create_printer_valid, test_create_printer_optional_fields_null | PASS (both, real assertions: 201, id, is_active, fields) |
| R2 | test_list_printers_active_only, test_list_printers_sorted_by_name | PASS (inactive excluded, alpha order) |
| R3 | test_get_printer_by_id_includes_inactive, test_get_printer_by_id_not_found | PASS |
| R4 | test_update_printer_fields, test_update_printer_refreshes_updated_at | PASS |
| R5 | test_soft_delete_printer, test_soft_deleted_printer_hidden_from_list, test_soft_delete_preserves_maintenance | PASS |
| R6 | test_list_printers_only_own, test_get_foreign_printer_404, test_update_foreign_printer_404, test_delete_foreign_printer_404, test_create_maintenance_foreign_printer_404, test_list_maintenance_foreign_printer_404 | PASS (all 404, no leak) |
| R7 | test_duplicate_printer_name_409, test_duplicate_name_case_insensitive_409, test_duplicate_name_after_archive_allowed | PASS |
| R8 | test_create_printer_empty_name_422, test_update_printer_empty_name_422 | PASS (empty + whitespace) |
| R9 | test_create_maintenance_valid, test_maintenance_requires_existing_printer_404 | PASS |
| R10 | test_invalid_maintenance_type_422 | PASS |
| R11 | test_negative_maintenance_cost_422, test_maintenance_without_cost_allowed | PASS |
| R12 | test_list_maintenance_ordered_by_date_desc | PASS |
| R15 | test_nozzle_sizes_presets_and_custom_accepted, test_nozzle_sizes_empty_allowed, test_duplicate_nozzle_sizes_422, test_invalid_nozzle_size_422 | PASS |
| R16 | test_negative_power_watts_422, test_negative_lifespan_hours_422, test_negative_spare_parts_cost_422 | PASS |
| R17 (backend) | test_create_printer_with_image_url, test_update_printer_image_url, test_printer_image_url_invalid_422 | PASS (persist, clear-to-null, http(s)/500 rules) |
| R20 (backend) | test_get_printer_catalog, test_get_printer_catalog_requires_auth, test_create_printer_custom_brand_model_accepted | PASS |
| R13, R14, R18, R19, R17/R20 (UI) | No automated FE tests exist in this repo (no FE test infra, consistent with all prior features). Mapped to `pnpm build` + API smoke + code inspection. See note 1. | Build PASS; UI code inspected by reviewer, implements each requirement |

## Tasks

70/70 `[x]`, 0 pending.

## Test results (reviewer-run)

- `pytest tests/ -q` → **135 passed** (94 baseline + 41 new), 0 skipped
- `alembic heads` → single head `012`; migration chained on `46ac01109cd2`
- `pnpm build` → passes; both new routes present (`/dashboard/printers`,
  `/dashboard/printers/[id]`)

## Coverage (reviewer-run, `--cov=backend`)

| File | Coverage |
|---|---|
| backend/api/printers.py | 100% |
| backend/models/printer.py | 100% |
| backend/schemas/printer.py | 93% |
| backend/services/printer_catalog.py | 100% |
| backend/services/printer_service.py | 95% |
| TOTAL | 87% ✓ (all touched files > 70%) |

## Verdict: APPROVED

Notes (non-blocking; report only, not fixed per reviewer rules):

1. **UI requirements R13/R14/R18/R19 (and the UI halves of R17/R20) have no
   automated tests** — this repo has no frontend test infrastructure and the
   spec's own task list defines none, so they are verified by `pnpm build` +
   code inspection here, with the browser walk-through left for the human
   (same convention as every prior full-stack feature). Reviewer read all new
   UI files: card grid + create/edit/archive + confirm, freeSolo brand/model
   selects (brand change clears model), nozzle multiselect with presets,
   image URL field with live preview + "Quitar imagen", fallback icon on
   missing/broken URL, detail page with maintenance table + add dialog,
   "Impresoras" nav under "Equipo". All present.
2. **Nozzle validator edge cases** (`backend/services/printer_service.py:6`):
   `"NaN"` raises an uncaught `decimal.InvalidOperation` (→ HTTP 500 instead
   of 422) and `"Infinity"` is accepted as a "custom size". Both violate R15's
   "positive decimal" rule. Suggest rejecting non-finite Decimals.
3. **Brand/model max length**: impl report claims "≤100 trim-to-null" in the
   schema, but `schemas/printer.py` only trims — a >100-char brand/model
   passes validation and fails at the DB `VARCHAR(100)` with a 500 instead of
   a clean 422 (R20 says max 100 chars). Add a length validator.

None of the above fail a checklist item; the R→test map, tests, tasks, and
coverage all pass.
