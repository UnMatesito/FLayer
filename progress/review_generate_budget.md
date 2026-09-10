# Review: generate_budget

Date: 2026-09-09

NOTE: this first pass was REJECTED. Re-review 2026-09-09 (same day):
all 4 findings fixed by the implementer → APPROVED (see the re-review
verdict section in `progress/impl_generate_budget.md`). This doc is kept
only as the record of the rejected first pass.

## Scope

- Reviewed current `generate_budget` feature revision, with emphasis on the 2026-09-09 R12-R15 margin/post-processing changes and follow-ups.
- Read required context docs plus budget-related changed source/tests only.

## Requirements Listed

- R1 Budget — Multi-filament selection
- R2 Budget — Manual filament cost
- R3 Budget — Auto-calculation
- R4 Budget — Manual price override
- R5 Budget status — Draft
- R6 Budget status — Send to client
- R7 Budget status — Approve/Reject
- R8 Generate budget — Invalid inputs
- R9 Budget visibility — Order detail
- R10 No budget — Empty state
- R11 Budget — Printer profile machine parameters
- R12 Budget — Per-budget earnings margin presets
- R13 Budget — Custom earnings margin
- R14 Budget — Post-processing costs
- R15 Budget — MercadoLibre convenience price removed

## Traceability

- [x] R1 ← `test_create_budget_with_filament_items`, `test_filament_price_snapshot` — PASS
- [x] R2 ← `test_create_budget_manual_filament_cost` — PASS
- [x] R3 ← `test_create_budget_calculates_correctly`, `test_update_budget_recalculates`, `test_budget_preview_no_persist`, `test_budget_response_has_computed_fields` — PASS
- [x] R4 ← `test_manual_price_override` — PASS
- [x] R5 ← `test_create_budget_status_draft` — PASS
- [x] R6 ← `test_status_transition_draft_to_sent` — PASS
- [x] R7 ← `test_status_transition_sent_to_approved`, `test_status_transition_sent_to_rejected`, `test_status_transition_draft_to_approved` — PASS
- [x] R8 ← `test_create_budget_no_filaments`, `test_create_budget_grams_zero`, `test_create_budget_extra_costs_negative`, `test_create_budget_negative_hours` — PASS
- [x] R9 ← `test_budget_response_has_computed_fields` — PASS
- [x] R10 ← `test_get_budget_nonexistent_order`, `test_get_budget_no_budget` — PASS
- [ ] R11 ← missing from `progress/impl_generate_budget.md` traceability map — BLOCKING
- [x] R12 ← `test_create_budget_margin_preset_and_post_processing`, `test_budget_uses_configured_parameters` — PASS
- [ ] R13 ← backend custom-margin tests pass, but the traceability does not include an automated test for the required frontend preset-button/numeric-input behavior — BLOCKING
- [ ] R14 ← backend post-processing tests pass, but the traceability does not include an automated test for the required disabled-toggle UI behavior and zero-value submit behavior — BLOCKING
- [ ] R15 ← backend `ml_price` removal test passes, but the traceability does not include an automated test for the required UI removal of the ML suggested price line — BLOCKING

## Findings

1. `progress/impl_generate_budget.md:47-61` omits R11 from the R→test traceability map even though `specs/generate_budget/requirements.md:109-122` defines R11. Add an R11 traceability entry pointing to the existing printer-profile tests, including create, default fallback, partial fallback, foreign/missing 404, snapshot immutability, preview, GET printer name, PUT re-snapshot, clear, and keep-snapshot tests.
2. `progress/impl_generate_budget.md:120-123` maps R13 only to backend custom-margin tests. R13 also requires frontend behavior from `specs/generate_budget/requirements.md:159-165`: preset buttons write the numeric input, exact preset values keep only that preset enabled/active, and custom values such as `6` disable all preset buttons and submit `custom`. Add a real automated frontend/component/e2e test or narrow the requirement before review.
3. `progress/impl_generate_budget.md:120-123` maps R14 only to backend post-processing math/validation tests. R14 also requires disabled post-processing UI behavior from `specs/generate_budget/requirements.md:177-180`: inputs are not editable and submitted values are zero. Add a real automated frontend/component/e2e test covering the toggle-off behavior and submitted payload.
4. `progress/impl_generate_budget.md:123` maps R15 only to an API response test. R15 also requires the UI to no longer display the ML suggested price line per `specs/generate_budget/requirements.md:184-187`. Add an automated frontend/component/e2e assertion that the budget form/breakdown no longer render that line, or otherwise provide a traceable automated check.

## Tasks

- All tasks in `specs/generate_budget/tasks.md` are marked `[x]`.

## Verification

- `poetry run pytest tests/ -q --cov=backend --cov-report=term-missing` from `src` → 214 passed, total backend coverage 88%.
- Touched backend budget-file coverage is above 70%: `backend/api/budget.py` 94%, `backend/models/budget.py` 100%, `backend/models/budget_parameters.py` 100%, `backend/schemas/budget.py` 83%, `backend/services/budget_service.py` 93%.
- `npx tsc --noEmit` from `src/frontend` → PASS.
- `pnpm build` from `src/frontend` → PASS.
- No frontend test/spec files or Playwright config were found under `src/frontend`, so frontend-only requirement clauses currently have no measurable automated coverage.

## Verdict: REJECTED

Traceability is incomplete for R11, and R13-R15 have untested frontend requirement clauses. Do not mark this revision approved until the missing traceability/tests are added and verification is rerun.
