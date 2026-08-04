# Current

**Feature:** none active — `printer_profiles` (done) + `generate_budget` R11 (done, approved)
**Next:** pick next feature from `feature_list.json` (region_parameters, email_notifications, dashboard, reports pending)

- `printer_profiles`: implemented + reviewer APPROVED → `progress/review_printer_profiles.md`; marked `done`
- `generate_budget` R11 (printer select in budget form): implemented + reviewer APPROVED → `progress/review_budget_r11.md` (1 rejection → fixed: missing PUT tests, stale `final_price` bug)
- 147/147 tests, build clean

Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `region_parameters` (no deps)
- `email_notifications` (depends on `order_status`)
- `dashboard` (depends on `stock_management`, `generate_budget`) — both deps done
- `reports` (depends on `dashboard`)