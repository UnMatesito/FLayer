# Project State

**Current feature:** *generate_budget*
**Status:** done
**Active tasks:** none

## Architecture

FastAPI + Next.js 16 + PostgreSQL (Docker) + MUI v7. SDD workflow (spec → code → review). Single-user MVP, multi-tenant ready (user_id in all tables). JWT + email OTP auth.

**Infrastructure:** `cd src && docker compose up -d` for PostgreSQL 16 + pgAdmin (:5050) + Mailpit (:8025).

## Key Decisions

- SDD: every feature specs before code, EARS notation, R→test traceability
- Soft-delete, audit log, ACID stock operations
- All features in `feature_list.json`

## Relevant files

- `specs/create_order/{requirements,design,tasks}.md`
- `progress/current.md`

## Blockers

None.

## Next

Human approval → launch implementer.
