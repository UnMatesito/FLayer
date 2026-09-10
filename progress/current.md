# Current

**Feature:** none in flight — `dash_enhancement` closed.

**create_order:** DONE — R8-R24 revision implemented, reviewer APPROVED (re-review
2026-09-09), manual Layer-3 verification completed by the human; marked `done`
in `feature_list.json`.

**generate_budget:** DONE — R12-R15 revision reviewer APPROVED 2026-09-09
(1 rejection for missing R11 traceability + untested R13-R15 frontend clauses →
fixed with R11 entries + Vitest/Testing Library frontend tests → re-review
APPROVED). Marked `done` in `feature_list.json`.

## Done this session

- `brand_identity`: DONE → hero restructured (full-width bg-plate, nozzle SVG with evenodd cutout, rounded bar, responsive sm/lg), logo cache-bust fix (storage_service.py `?v={mtime}`), manual updated (removed "Panel del taller", added "Pedidos" + "Productos"). Build clean, committed.
- `create_order`: DONE → R7 store-token hardening implemented: `public_store.py` token=None → 404 (removed ANONYMOUS_USER_ID), `orders.py` removed anonymous user fabrication (user not found → 404), `StoreTokenFactory` created, 4 new 404 tests (missing/unknown token for orders + products), existing tests updated with valid tokens. 207/207 tests pass.
- `create_order`: spec revision prepared 2026-09-09 (R8-R24) for order category selection, print service checkboxes, dimensions, delivery type, and operator delivery-cost capture after posting; amended before approval so delivery-cost capture uses only `embalaje` + `Precio Envio` and `3d printing` defaults selected for `print` orders. Status remains `spec_ready`; pending human approval before implementation.
- `generate_budget` / `region_parameters`: spec revision implemented 2026-09-09 for per-budget earnings margin presets/custom value, post-processing costs, ML price removal, and removing regional margin multipliers. `generate_budget` is `in_progress` pending review; `region_parameters` contract changes are implemented and remain `done`.

## Context (prior sessions, all committed)

- `region_parameters`: DONE → `progress/impl_region_parameters.md` (R1–R17, 203 tests, coverage api/budget.py 96% / budget_service.py 93% / api/auth.py 97%, tsc + build clean, reviewer APPROVED 2026-08-12). Marked `done` in `feature_list.json`.
- `dashboard`: DONE → `progress/impl_dashboard.md` (R1–R23, 181 tests, build clean, coverage 98%, reviewer APPROVED). Manual UI/branding pass completed by human; marked `done` in `feature_list.json`.

## Prior context

- `printer_profiles`: done; 2026-08-04 review hardening done (non-finite nozzles → 422, brand/model ≤100 chars → 422)
- `generate_budget` R11: done (printer select); 1 rejection → fixed
- 203/203 baseline tests + implementation; build clean
- Rule in effect: review docs only when they contain recommended changes (verdicts inline in impl files)
- Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `create_order` (spec_ready — 2026-09-09 order category/delivery revision pending approval; delivery-cost capture uses only `embalaje` + `Precio Envio` and `print` defaults to `3d printing`; `generate_budget` remains active in-progress)
- `registration` (no deps beyond done auth — deferred registration UI, includes currency at registration)
- `email_notifications` (depends on `order_status`)
- `reports` (depends on `dashboard`) — dep done, unblocked
- `dash_enhancement` (done — reviewer APPROVED 2026-09-10; custom favicon, global feedback popups, closeable low-stock popup notifications plus persistent product/filament/Insumo low-stock visibility, table-card filters, unified Historial movement filtering, error pages/error normalization, responsive CRUD drawers, creative detail cards, full responsive pass, and Hallmark audit; 5 browser-viewport verification tasks open for manual human pass)
- `multi_language` (pending — added to feature_list 2026-09-09; language selection in user settings; depends on `authentication`, `dashboard`)
- `export_final_budget` (pending — added to feature_list 2026-09-09; export of the final budget; depends on `generate_budget`)
