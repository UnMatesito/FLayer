# Current

**Feature:** none — brand_identity + create_order DONE

## Done this session

- `brand_identity`: DONE → hero restructured (full-width bg-plate, nozzle SVG with evenodd cutout, rounded bar, responsive sm/lg), logo cache-bust fix (storage_service.py `?v={mtime}`), manual updated (removed "Panel del taller", added "Pedidos" + "Productos"). Build clean, committed.
- `create_order`: DONE → R7 store-token hardening implemented: `public_store.py` token=None → 404 (removed ANONYMOUS_USER_ID), `orders.py` removed anonymous user fabrication (user not found → 404), `StoreTokenFactory` created, 4 new 404 tests (missing/unknown token for orders + products), existing tests updated with valid tokens. 207/207 tests pass.

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

- `registration` (no deps beyond done auth — deferred registration UI, includes currency at registration)
- `email_notifications` (depends on `order_status`)
- `reports` (depends on `dashboard`) — dep done, unblocked
- `dash_enhancement` (spec_ready — favicon + branding; depends on `brand_identity` — now unblocked)
