# Flayer - 3D Printing Admin Panel

Administration Panel for 3D printing business — orders, budgets, stock, printers and reports. Developed with **Spec Driven Development** on a harness of agents (Leader → Spec Author → Implementer → Reviewer).

> The scope of the product lives in `docs/architecture.md`. This README only
> explains how to get started.

## Getting Started

```bash
cd src
docker compose up -d    # start PostgreSQL + pgAdmin + Mailpit
./init.sh
```

pgAdmin at `http://localhost:5050` (admin@flayer.local / admin).
Mailpit (email testing) at `http://localhost:8025` — SMTP on `localhost:1025`.

If everything is green, open `AGENTS.md` and follow the instructions there.

## Stack

FastAPI + PostgreSQL (backend) · Next.js + MUI (frontend) · SendGrid (email)

## Workflow

1. `feature_list.json` is the only source of truth for what is pending,
   in spec, in progress or done.
2. Each feature lives in `specs/<feature>/` with 3 files: `requirements.md`
   (EARS), `design.md`, `tasks.md`.
3. Nothing is implemented without a spec approved by the product owner (Maker).
4. The session state lives in `progress/`, not in the chat.

See `docs/specs.md` for the full process.
