# Current

**Feature:** none active — `printer_profiles` (done) + `generate_budget` R11 (done, approved)
**Next:** pick next feature from `feature_list.json` (region_parameters, email_notifications, dashboard, reports pending)

- `printer_profiles`: implemented + reviewer APPROVED, review recommended changes implemented; marked `done`
- `generate_budget` R11 (printer select in budget form): implemented + reviewer APPROVED (1 rejection → fixed, re-approved)
- 151/151 tests, build clean
- 2026-08-04: review recommended changes from `printers` implemented (non-finite nozzles → 422, brand/model ≤100 chars → 422)
- 2026-08-04: new rule — review docs only when they contain recommended changes; clean approvals recorded as inline `## Reviewer verdict` in impl files; all `progress/review_*.md` eliminated (verdicts migrated inline)

Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `region_parameters` (no deps)
- `email_notifications` (depends on `order_status`)
- `dashboard` (depends on `stock_management`, `generate_budget`) — both deps done
- `reports` (depends on `dashboard`)