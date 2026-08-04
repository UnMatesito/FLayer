# Review: generate_budget R11 (printer select in budget form)

Reviewed 2026-07-31 by reviewer. Scope: R11 only (printer profile integration).
R1–R10 assumed previously reviewed/approved. Second review — re-checks the
two items from the prior REJECTION.

## Traceability (R11 → test)

- [x] R11 (params loaded + snapshotted on create) ← test_create_budget_with_printer_profile — PASS
- [x] R11 (defaults when no printer) ← test_create_budget_without_printer_uses_defaults — PASS
- [x] R11 (per-field fallback) ← test_create_budget_printer_partial_fields_fallback — PASS
- [x] R11 (404 foreign) ← test_create_budget_foreign_printer_404 — PASS
- [x] R11 (404 nonexistent) ← test_create_budget_nonexistent_printer_404 — PASS
- [x] R11 (snapshot immutability, GET path) ← test_budget_snapshot_immutable — PASS
- [x] R11 (preview) ← test_preview_with_printer_profile — PASS
- [x] R11 (GET name + snapshotted params) ← test_get_budget_returns_printer_name — PASS
- [x] R11 (editing — PUT with printer_id) ← TestUpdateBudgetPrinterProfile (4 tests) — PASS
- [x] R11 (UI) ← `pnpm build` clean + code inspection (BudgetForm printer select, BudgetBreakdown "Máquina" block, api.ts types) — PASS

## Rejection item 1: PUT re-snapshot path — RESOLVED

`TestUpdateBudgetPrinterProfile` (src/tests/integration/test_budget.py:620)
now covers the previously uncovered PUT printer path:

- `test_update_budget_changes_printer_resnapshots` — switch printer → new
  params in breakdown (electricity 84.0, amortization 50.0) + row snapshots
- `test_update_budget_clears_printer` — `printer_id: null` → snapshots NULL,
  defaults used (33.6/69.44)
- `test_update_budget_items_only_keeps_snapshot` — items-only PUT keeps
  original snapshot
- `test_update_budget_final_price_recalculated_on_partial_update` —
  regression for rejection item 2

## Rejection item 2: stale `final_price` on partial PUT — RESOLVED

`src/backend/api/budget.py:35` adds `CALC_AFFECTING_FIELDS` frozenset
(`filament_items`, `printer_id`, `manual_filament_cost`, `hours`, `minutes`,
`extra_costs`, `margin_type`, `manual_price`, `currency`);
`budget.py:272` now computes `recalc_needed = bool(body.model_fields_set &
CALC_AFFECTING_FIELDS)`. A PUT changing only hours/extra_costs/manual_price
now triggers recalculation. The regression test asserts response math, the
persisted `row.final_price`, and a subsequent GET — no stale price, no
response/DB inconsistency.

## Tasks

`specs/generate_budget/tasks.md` — all `[x]`, PUT tasks annotated with
review-follow-up; 4 new PUT test tasks added as `[x]`.

## Verification (run by reviewer, not implementer)

- `pytest --cov` — 147 passed in 4.02s
- Coverage of R11-touched files: `api/budget.py` 94% (8 uncovered = minor
  branches: 404 helper, notes/currency/minutes-only assignments, no-recalc
  fallback), `models/budget.py` 100%, `schemas/budget.py` 76%,
  `services/budget_service.py` 90% — all > 70% ✓
- `pnpm build` — clean, TypeScript passes, printer routes present ✓

## Verdict: APPROVED

Both rejection items are fully resolved and verified independently:
1. PUT printer re-snapshot path tested (4 real DB tests, previously
   uncovered lines now exercised, `api/budget.py` 85% → 94%).
2. Stale `final_price` bug fixed via `CALC_AFFECTING_FIELDS` gate with a
   regression test covering hours/extra_costs/manual_price-only PUTs
   (response + DB row + GET all consistent).
