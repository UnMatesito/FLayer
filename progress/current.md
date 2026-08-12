# Current

**Feature:** none — all approved work done
**Next:** human picks next feature (`app_entry`, `reports`, `dashboard` pending choices)

- `region_parameters`: DONE → `progress/impl_region_parameters.md` (R1–R17, 203 tests, coverage api/budget.py 96% / budget_service.py 93% / api/auth.py 97%, tsc + build clean, reviewer APPROVED 2026-08-12). Marked `done` in `feature_list.json`.
- `dashboard`: DONE → `progress/impl_dashboard.md` (R1–R23, 181 tests, build clean, coverage 98%, reviewer APPROVED). Manual UI/branding pass completed by human; marked `done` in `feature_list.json`.

## Context (prior sessions, all committed)

- `printer_profiles`: done; 2026-08-04 review hardening done (non-finite nozzles → 422, brand/model ≤100 chars → 422)
- `generate_budget` R11: done (printer select); 1 rejection → fixed
- 203/203 baseline tests, 181 with dashboard; build clean
- Rule in effect: review docs only when they contain recommended changes (verdicts inline in impl files)

Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `registration` (no deps beyond done auth — deferred registration UI, includes currency at registration)
- `email_notifications` (depends on `order_status`)
- `reports` (depends on `dashboard`) — dep done, unblocked
- `app_entry` (spec_ready — awaiting human approval)