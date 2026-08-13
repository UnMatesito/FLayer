# Project State

**Current feature:** none (brand_identity + create_order done)
**Status:** brand_identity DONE + create_order R7 DONE; ready to commit
**Next:** `dash_enhancement` or `email_notifications`

## Architecture

FastAPI + Next.js 16 + PostgreSQL (Docker) + MUI v7. SDD workflow (spec → code → review). Single-user MVP, multi-tenant ready (user_id in all tables). JWT + email OTP auth.

**Infrastructure:** `cd src && docker compose up -d` for PostgreSQL 16 + pgAdmin (:5050) + Mailpit (:8025).

## Key Decisions

- SDD: every feature specs before code, EARS notation, R→test traceability
- Soft-delete, audit log, ACID stock operations
- All features in `feature_list.json`

## Relevant files

- `specs/brand_identity/{requirements,design,tasks}.md`
- `specs/create_order/{requirements,design,tasks}.md`
- `progress/impl_brand_identity.md`
- `progress/review_brand_identity.md`

## Blockers

None.

## Next

`dash_enhancement` (favicon + branding) or `email_notifications`. See `feature_list.json` for dependency graph.
