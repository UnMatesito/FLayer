# Project State

**Current feature:** none (brand_identity + create_order done)
**Status:** `dash_enhancement` DONE; ready to commit
**Next:** `registration`, `email_notifications`, `reports`, `multi_language`, or `export_final_budget`

## Architecture

FastAPI + Next.js 16 + PostgreSQL (Docker) + MUI v7. SDD workflow (spec → code → review). Single-user MVP, multi-tenant ready (user_id in all tables). JWT + email OTP auth.

**Infrastructure:** `cd src && docker compose up -d` for PostgreSQL 16 + pgAdmin (:5050) + Mailpit (:8025).

## Key Decisions

- SDD: every feature specs before code, EARS notation, R→test traceability
- Soft-delete, audit log, ACID stock operations
- All features in `feature_list.json`

## Relevant files

- `specs/dash_enhancement/{requirements,design,tasks}.md`
- `progress/impl_dash_enhancement.md`

## Blockers

None.

## Next

`registration` (no deps beyond auth — deferred registration UI), `email_notifications` (depends on `order_status`), `reports` (depends on `dashboard`), `multi_language` (depends on `authentication` + `dashboard`), or `export_final_budget` (depends on `generate_budget`). See `feature_list.json` for dependency graph.
