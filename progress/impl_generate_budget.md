# Implementation Progress — generate_budget

## Status

**Backend:** 12/12 tasks done
**Frontend:** 7/7 tasks done
**Tests:** 19/19 tasks done

## Files Modified/Created

### Backend (new files)
| File | Purpose |
|------|---------|
| `src/backend/models/budget.py` | Budget SQLAlchemy model |
| `src/backend/schemas/budget.py` | Pydantic schemas (7 classes) |
| `src/backend/services/budget_service.py` | BudgetCalculator with formula + hardcoded defaults |
| `src/backend/api/budget.py` | 5 endpoints (POST/GET/PUT/PATCH/preview) |

### Backend (modified files)
| File | Change |
|------|--------|
| `src/backend/models/__init__.py` | Added Budget import |
| `src/backend/main.py` | Added budget_router, added "approved" to SEED_STATUSES |
| `src/backend/services/email_service.py` | Added send_budget_provided abstract method + stub |
| `src/alembic/env.py` | Added Budget import |
| `src/alembic/versions/007_create_budgets_table.py` | Migration for budgets table |

### Frontend (new files)
| File | Purpose |
|------|---------|
| `src/frontend/src/components/BudgetForm.tsx` | Budget create/edit dialog with live preview |
| `src/frontend/src/components/BudgetBreakdown.tsx` | Read-only budget display with status actions |

### Frontend (modified files)
| File | Change |
|------|--------|
| `src/frontend/src/app/api.ts` | Added budget types + 5 API functions |
| `src/frontend/src/app/dashboard/orders/[id]/page.tsx` | Added budget section with form/breakdown |
| `src/frontend/src/components/OrdersTable.tsx` | Added "Presupuesto" column with status chip |

### Tests
| File | Status |
|------|--------|
| `src/tests/integration/test_budget.py` | 19 tests, all passing |
| `src/tests/conftest.py` | Added "approved" to SEED_STATUSES |

## R → Test traceability

| Req | Test(s) |
|-----|---------|
| R1. Multi-filament selection | `test_create_budget_with_filament_items`, `test_filament_price_snapshot` |
| R2. Manual filament cost | `test_create_budget_manual_filament_cost` |
| R3. Auto-calculation | `test_create_budget_calculates_correctly`, `test_update_budget_recalculates`, `test_budget_preview_no_persist`, `test_budget_response_has_computed_fields` |
| R4. Manual price override | `test_manual_price_override` |
| R5. Draft status | `test_create_budget_status_draft` |
| R6. Send to client | `test_status_transition_draft_to_sent` (email mock) |
| R7. Approve/Reject | `test_status_transition_sent_to_approved`, `test_status_transition_sent_to_rejected`, `test_status_transition_draft_to_approved` |
| R8. Invalid inputs | `test_create_budget_no_filaments`, `test_create_budget_grams_zero`, `test_create_budget_extra_costs_negative`, `test_create_budget_negative_hours` |
| R9. Budget visibility | `test_budget_response_has_computed_fields` |
| R10. Empty state | `test_get_budget_nonexistent_order`, `test_get_budget_no_budget` |
| R11. Printer profile machine parameters | `test_create_budget_with_printer_profile`, `test_create_budget_without_printer_uses_defaults`, `test_create_budget_printer_partial_fields_fallback`, `test_create_budget_foreign_printer_404`, `test_create_budget_nonexistent_printer_404`, `test_budget_snapshot_immutable`, `test_preview_with_printer_profile`, `test_get_budget_returns_printer_name`, `test_update_budget_changes_printer_resnapshots`, `test_update_budget_clears_printer`, `test_update_budget_items_only_keeps_snapshot` |

## pytest results

```
$ pytest tests/ -v --cov=backend
81 passed in 2.71s
Coverage: 90%
```

### Test list (19 budget tests)
```
✓ test_create_budget_with_filament_items
✓ test_create_budget_manual_filament_cost
✓ test_create_budget_no_filaments
✓ test_create_budget_grams_zero
✓ test_create_budget_extra_costs_negative
✓ test_create_budget_negative_hours
✓ test_create_budget_calculates_correctly
✓ test_create_budget_status_draft
✓ test_update_budget_recalculates
✓ test_manual_price_override
✓ test_filament_price_snapshot
✓ test_status_transition_draft_to_sent
✓ test_status_transition_sent_to_approved
✓ test_status_transition_sent_to_rejected
✓ test_status_transition_draft_to_approved
✓ test_get_budget_nonexistent_order
✓ test_get_budget_no_budget
✓ test_budget_preview_no_persist
✓ test_budget_response_has_computed_fields
```

## Manual Verification

Run:
```bash
cd src && poetry run pytest tests/ -v --cov=backend
```

## Revision — 2026-09-09: per-budget margins and post-processing

- Specs updated in `specs/generate_budget/*` and `specs/region_parameters/*` before implementation.
- Backend:
  - Migration `020_budget_margin_post_processing.py` adds `budgets.assembly_cost`, `sanding_cost`, `painting_cost` and removes the obsolete regional multiplier columns from `budget_parameters`.
  - `BudgetParameters` now stores only `electricity_price_kwh` and `error_margin_percent`.
  - `BudgetCreate` / `BudgetUpdate` / `BudgetPreviewRequest` now accept `margin_type`, optional custom `margin_multiplier`, and post-processing fields.
  - `BudgetResponse` returns post-processing lines and `post_processing_total`; `ml_price` is removed.
  - `budget_service.py` derives preset multipliers from code constants: `2.0`, `2.5`, `3.0`, `3.5`, `4.0`, `5.0`; `custom` uses the request multiplier.
- Frontend:
  - `api.ts` exposes `BUDGET_MARGIN_OPTIONS` with the requested reference labels.
  - `BudgetForm` replaced the old mayorista/comercio/llavero selector with all presets plus custom multiplier and added the post-processing section.
  - `BudgetBreakdown` shows post-processing lines and no longer shows the ML price.
  - Profile `Parámetros del Maker` now edits only electricity and error margin.
- Tests:
  - Added coverage for preset margin + post-processing math, custom margin, custom validation, negative post-processing rejection, and obsolete regional multiplier rejection.
  - Updated budget-parameter tests to assert regional settings no longer expose or accept multiplier fields.

### Revision traceability

- R12 ← `test_create_budget_margin_preset_and_post_processing`, `test_budget_uses_configured_parameters`
- R13 ← `test_create_budget_custom_margin_multiplier`, `test_create_budget_custom_margin_requires_multiplier`, frontend `BudgetForm.test.tsx` (preset buttons write numeric input, exact preset stays active, custom `6` submits `custom`)
- R14 ← `test_create_budget_margin_preset_and_post_processing`, `test_create_budget_post_processing_negative_rejected`, frontend `BudgetForm.test.tsx` (toggle-off removes inputs, submits zero post-processing costs)
- R15 ← `test_budget_response_has_computed_fields`, frontend `BudgetForm.test.tsx` + `BudgetBreakdown.test.tsx` (no ML suggested price line rendered)
- region R18 ← `test_put_parameters_rejects_obsolete_multiplier_fields`, seeded/update budget-parameter tests
- region R19 ← `test_budget_uses_configured_parameters`, budget create/preview tests

### Revision verification

- `poetry run pytest tests/integration/test_budget.py tests/integration/test_budget_parameters.py -q` → 51 passed
- `poetry run pytest tests/ -q` → 212 passed
- `npx tsc --noEmit` → clean
- `pnpm build` → clean
- `./init.sh` → clean

### Follow-up — 2026-09-09: margin buttons and post-processing toggle

- Specs updated before implementation: R13 restores custom/numeric margin values outside preset buttons while keeping preset buttons at `2.0..5.0`; R14 requires a post-processing toggle.
- Backend: `margin_multiplier` validation restored to `>0..100`; tests cover custom value `6` and invalid `0` / `100.01` rejection.
- Frontend: `BudgetForm` margin select replaced with preset buttons plus numeric input. Buttons write `2`, `2.5`, `3`, `3.5`, `4`, or `5` into the input; any other valid numeric value (for example `6`) leaves all buttons inactive and is sent as `custom`.
- Frontend: post-processing fields are behind `Requiere post-procesado`; disabling it clears and submits zero values.
- Verification: `npx tsc --noEmit` clean; budget subset `52 passed`; full backend suite `213 passed`; Ruff clean; `pnpm build` clean; `./init.sh` clean.

### Follow-up — 2026-09-09: restore custom values outside preset range

- Human clarified that values like `6` must be valid custom margins; the preset buttons are references only.
- Backend: `margin_multiplier` validation restored to `>0..100`; `test_create_budget_custom_margin_multiplier` now asserts `6.00` produces a custom-margin final price, while `0` and `100.01` are rejected.
- Frontend: margin input now allows `0.01..100`; preset buttons only use `contained` state when the numeric input exactly equals their preset value, so `6` leaves all preset buttons inactive and is sent as `custom`.
- Verification: budget subset `52 passed`; full backend suite `213 passed`; `npx tsc --noEmit` clean; Ruff clean; `pnpm build` clean; `./init.sh` clean.

## Implementer follow-up — review rejection 2026-09-09

Review `progress/review_generate_budget.md` findings addressed:

- R11: added the printer-profile test mapping to the R→test traceability table (finding 1).
- R13–R15: added the first frontend test harness and automated component tests
  covering the previously untested frontend requirement clauses (findings 2–4).

### Files touched

- `src/frontend/package.json` — added `vitest@4.1.11`, `vite@7.3.6`, `jsdom`,
  `@testing-library/react`, `@testing-library/user-event` to devDependencies and a
  `test` script (`vitest run`). Vite pinned to 7 because the latest Vitest resolves
  Vite 8, whose optional `lightningcss@^1.33.0` is not published to the registry yet.
- `src/frontend/pnpm-workspace.yaml` — allowed the `esbuild` postinstall build script.
- `src/frontend/vitest.config.ts` (NEW) — jsdom environment, `@` → `./src` alias,
  automatic JSX transform, setup file.
- `src/frontend/vitest.setup.ts` (NEW) — RTL auto-cleanup plus jsdom stubs
  (`matchMedia`, `ResizeObserver`, `requestAnimationFrame`).
- `src/frontend/src/components/BudgetForm.test.tsx` (NEW) — R13/R14/R15 form tests.
- `src/frontend/src/components/BudgetBreakdown.test.tsx` (NEW) — R15 breakdown test.
- `progress/impl_generate_budget.md` — R11 traceability + this follow-up section.
- `specs/generate_budget/tasks.md` — follow-up task lines appended (see below).

### Tests added

- R13 ← `BudgetForm.test.tsx` "preset buttons write the numeric margin input and only
  the exact preset stays active" (click `×2.5` → input `2.5`, only that preset contained).
- R13 ← `BudgetForm.test.tsx` "a custom multiplier such as 6 disables every preset
  button and submits a custom margin" (all presets outlined; `margin_type: 'custom'`,
  `margin_multiplier: 6` in the submitted payload).
- R14 ← `BudgetForm.test.tsx` "disabling post-processing removes the inputs and submits
  zero post-processing costs" (toggle-off removes the inputs; submitted payload has
  `assembly_cost = sanding_cost = painting_cost = 0`).
- R15 ← `BudgetForm.test.tsx` "the form preview shows no ML suggested price line".
- R15 ← `BudgetBreakdown.test.tsx` "renders the computed breakdown without the ML
  suggested price line".

### Verification

- `pnpm test` from `src/frontend` → 5 passed (2 files).
- `npx tsc --noEmit` from `src/frontend` → clean.
- `pnpm build` from `src/frontend` → clean.
- `poetry run pytest tests/ -q` from `src` → 214 passed.
- Ruff: no violations in files touched by this follow-up; the 28 pre-existing
  violations live in unrelated files (`tests/factories/*`, `backend/api/orders.py`,
  `backend/api/products.py`, alembic versions, etc.).

## Blockers

None.

## Reviewer verdict

APPROVED — R11 (printer select) reviewed in `progress/review_budget_r11.md`
(2026-07-31): 1 rejection (missing PUT re-snapshot tests, stale
`final_price` on partial PUT) → fixed by implementer → re-reviewed APPROVED.
Both rejection items resolved; 147 tests at the time, now 151. Review doc
eliminated 2026-08-04 per the new rule: review docs exist only when they
contain recommended changes.

## Reviewer verdict — re-review 2026-09-09

APPROVED — the full current revision, including the R12–R15 2026-09-09
margin/post-processing changes, the follow-ups (custom margin values
`>0..100`, preset buttons + numeric input, post-processing toggle, ML price
removal), and the frontend test harness added in response to the rejected
first review pass.

Re-review of the 4 findings in `progress/review_generate_budget.md`:

1. Range: R11 now has a traceability entry pointing at the printer-profile
   tests (create, default fallback, partial fallback, foreign/missing 404,
   snapshot immutability, preview, GET printer name, PUT re-snapshot, clear,
   keep-snapshot). All 11 referenced tests exist in
   `src/tests/integration/test_budget.py`/`test_budget_parameters.py`.
2. R13: `BudgetForm.test.tsx` asserts preset buttons write the numeric
   input and only the exact preset stays `contained`, and that a custom
   value `6` disables every preset button and submits `margin_type:
   'custom'` with `margin_multiplier: 6`.
3. R14: `BudgetForm.test.tsx` asserts the post-processing toggle removes the
   inputs when disabled and that the submitted payload carries
   `assembly_cost = sanding_cost = painting_cost = 0`.
4. R15: `BudgetForm.test.tsx` (preview) and `BudgetBreakdown.test.tsx`
   assert no "MercadoLibre"/ML suggested price line is rendered.

Specs were last modified 2026-09-09 19:54, before the rejection review
(21:47) and the implementer's follow-up (22:05) — `requirements.md` and
`design.md` were not touched in response to the rejection; R13/R14 clauses
were strengthened, not narrowed.

Verification (rerun, 2026-09-09):
- `pnpm test` from `src/frontend` → 5 passed (2 files).
- `npx tsc --noEmit` from `src/frontend` → clean.
- `pnpm build` from `src/frontend` → clean.
- `poetry run pytest tests/ -q --cov=backend --cov-report=term-missing`
  from `src` → 214 passed, total backend coverage 88%.
- All tasks in `specs/generate_budget/tasks.md` are `[x]` (no unchecked
  items).

Blockers: none.
