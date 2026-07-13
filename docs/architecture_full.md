# Architecture — Flayer Admin Panel

## What it is

Centralized Web Administration Panel for managing a 3D printing business: orders, quotations, invoices, stock of filaments/inserts, printer profiles, and reports. MVP for 1 user; architecture ready for multi-tenant in the future (PaaS).

## Who it is for

- **MVP:** solo owner of a 3D printing business (1 printer, ~3 orders/month)
- **Future (V1.1+):** makers and SMEs in 3D printing, international, freemium

## What it is not (hard limits of MVP)

- No automatic integration with 3D printers — the operator enters grams/hours manually
- No marketplace or online store
- No automatic STL analysis (slicer external, any)
- No logistic shipping management (manual coordination)
- No multi-tenant in MVP (but `user_id` is in all tables)
- No AFIP/fiscal invoice integration
- No Resin Printing (only FDM)
- 2FA only via email OTP (no SMS/TOTP)

Full details of decision scope: see `feature_list.json` history
and the "Design" sections of each `specs/<feature>/design.md`.

## Users and responsibilities

| Task | Maker/Owner | Client | Auto (System) |
|---|---|---|---|
| Fill order form | X (if client doesn't do it) | X | |
| Generate budget | X | | ✓ (calculation) |
| Send budget | X | | |
| Confirm budget | | X | |
| Analyze file in external slicer | X | | |
| Enter grams + hours | X | | |
| Change order status | X | | |
| Deduct stock | | | ✓ |
| Notify client of status change | | | ✓ |

## Components

```
┌─────────────────────────────────────────────────┐
│              Flayer Admin Panel                 │
│         (FastAPI backend + Next.js frontend)     │
└───────────────────────┬───────────────────────────┘
                        │
     ┌──────────────────┼──────────────────┐
     ↓                  ↓                  ↓
PostgreSQL          Mailpit / SendGrid  File Storage
(Docker —            (dev / prod)        (STL/PDF —
 postgres:16,        Mailpit on :8025    local or S3)
 pgAdmin on :5050)   7 email triggers)
```

## Tech Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Backend | FastAPI (Python) | latest | Type hints, Pydantic v2 validation, async by default |
| Frontend | Next.js 16 | 16.x | App Router, Server Components, SSR, responsive |
| DB | PostgreSQL | 16+ | ACID transactions — critical for atomic stock ops |
| ORM | SQLAlchemy 2.0 | 2.x | Async ORM with `Mapped` types, `AsyncAttrs`, `mapped_column` |
| Migrations | Alembic | latest | SQLAlchemy-native migration tool |
| UI | MUI v7 | 7.x | Production-ready components, `sx` prop, `slots`/`slotProps` |
| Charts | Nivo | latest | Covers dashboard + reports |
| Data Fetching | TanStack Query v5 | 5.x | Server state management, cache invalidation, mutations |
| Auth | JWT + email OTP | — | Simple, no SMS dependency |
| Email | SendGrid / Mailgun | — | Reliable, template support |
| Package Managers | pip / poetry (Python), pnpm (Node) | — | Modern, virtual envs, local cache |
| Infrastructure | Docker Compose | — | PostgreSQL 16 + pgAdmin + Mailpit (see `src/docker-compose.yml`) |

## Design Principles

1. **Single-user now, multi-tenant tomorrow**: `user_id` in every table from day 1.
2. **Spec-driven**: every feature has EARS requirements before code.
3. **Obligatory Traceability**: every `R<n>` maps to a test.
4. **ACID Transactions**: all operations related to stock.
5. **Soft-delete**: nothing is physically deleted before 3 months (cancelled orders).
6. **Audit**: historical record of stock states and movements, immutable.

## References

- Data Model: `docs/data_model.md`
- SDD: `docs/specs.md`
- Code Conventions: `docs/conventions.md`
- How to Verify: `docs/verification.md`
- Feature List: `feature_list.json`
