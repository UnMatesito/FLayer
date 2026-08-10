# Current

**Feature:** `region_parameters` — spec_ready (awaiting human approval)
**Next:** human reads `specs/region_parameters/{requirements,design,tasks}.md` and says "approved" or "change X"

- `dashboard`: DONE → `progress/impl_dashboard.md` (R1–R23, 181 tests, build clean, coverage 98%, reviewer APPROVED). Manual UI/branding pass completed by human; marked `done` in `feature_list.json`.

## Context (prior sessions, all committed)

- `printer_profiles`: done; 2026-08-04 review hardening done (non-finite nozzles → 422, brand/model ≤100 chars → 422)
- `generate_budget` R11: done (printer select); 1 rejection → fixed
- 151/151 baseline tests, 181 with dashboard; build clean
- Rule in effect: review docs only when they contain recommended changes (verdicts inline in impl files)

Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `registration` (no deps beyond done auth — deferred registration UI, includes currency at registration)
- `region_parameters` (no deps)
- `email_notifications` (depends on `order_status`)
- `reports` (depends on `dashboard`) — dep done, unblocked