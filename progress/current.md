# Current

**Feature:** `dashboard` (implemented, awaiting review + manual pass)
**Next:** human manual verification (tasks 65–66) + reviewer → done

- `dashboard`: implementer done → `progress/impl_dashboard.md` (R1–R23, 181 tests, build clean, coverage 98%). Remaining tasks: #64 lint (pre-existing broken in Next 16), #65–66 manual UI/branding checks (human). Awaiting reviewer + human manual pass.

## Context (prior sessions, all committed)

- `printer_profiles`: done; 2026-08-04 review hardening done (non-finite nozzles → 422, brand/model ≤100 chars → 422)
- `generate_budget` R11: done (printer select); 1 rejection → fixed
- 151/151 tests, build clean
- Rule in effect: review docs only when they contain recommended changes (verdicts inline in impl files)

Note: `arquiminis` cancelled by human decision (2026-07-31) — feature no longer needed.

## Pending features

- `region_parameters` (no deps)
- `email_notifications` (depends on `order_status`)
- `dashboard` (depends on `stock_management`, `generate_budget`) — both deps done
- `reports` (depends on `dashboard`)