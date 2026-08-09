# Architecture Summary

## High-level

Flayer is a centralized web admin panel for 3D printing businesses: orders, budgets, stock, printers, reports. MVP targets solo owners; architecture is ready for multi-tenant.

**Stack:** FastAPI (Python) + Next.js 16 + PostgreSQL + MUI v7 + Tailwind CSS v4 + TanStack Query v5.

**Styling:** hybrid — Tailwind v4 utilities for layout/spacing/typography, MUI v7 for interactive widgets, driven by a single palette (MUI `cssVariables` → Tailwind `@theme` in `globals.css`).

**Infrastructure:** Docker Compose for PostgreSQL 16 + pgAdmin + Mailpit + SeaweedFS (see `src/docker-compose.yml`).

**Auth:** JWT + email OTP (2FA). No SMS/TOTP in MVP.

## Major components

```
FastAPI backend  ←→  PostgreSQL
      ↕           ↕
Next.js frontend  SeaweedFS (images, files)
   (MUI v7 + Tailwind v4)
      ↕
SendGrid (email)
```

## Design Principles

1. `user_id` in every table — multi-tenant tomorrow
2. Spec-driven development (EARS requirements before code)
3. Traceability: every R<n> maps to a test
4. ACID transactions for stock ops
5. Soft-delete (3 months), immutable audit log

## See also

- `docs/architecture_full.md` — complete reference
- `docs/data_model.md` — table schemas
- `docs/specs.md` — SDD process
