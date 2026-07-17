# Conventions — Style, Naming, Errors

## Python (Backend — FastAPI + SQLAlchemy 2.0)

- **Poetry** for dependency management and virtual environments — always use `poetry add`, `poetry remove`, `poetry lock`; never edit `pyproject.toml` dependencies by hand
- **Install**: `poetry install` from `src/` (includes dev dependencies)
- **Run**: `poetry run uvicorn backend.main:app ...` or `poetry run pytest`
- **Add dependency**: `poetry add <package>`
- **Add dev dependency**: `poetry add --group dev <package>`

- **Type hints** are mandatory in all public functions and method signatures
- **Pydantic v2** for request/response validation — `BaseModel` from `pydantic`, never raw dicts
- **SQLAlchemy 2.0 style** — use `Mapped`, `mapped_column`, `DeclarativeBase`, avoid legacy `Column` and `declarative_base()`
- **Async ORM** — use `AsyncAttrs`, `AsyncSession`, `async_sessionmaker`, `asyncpg` driver; never sync sessions
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes and models
- One file per model in `src/models/`, one router per domain in `src/api/`
- **Docstrings** on non-trivial functions (what it does, not how — the code says how)
- **Dependency injection** via `Depends` with `Annotated` syntax (Python 3.10+)
- **Repository pattern** is optional for MVP; keep it simple with direct session usage in routers

## TypeScript / React (Frontend — Next.js 16 App Router + MUI v7)

- Functional components + hooks, no classes
- **Server Components** by default; use `"use client"` only when needed (interactivity, MUI hooks)
- **Naming**: `PascalCase` for components, `camelCase` for functions/variables
- One component per file, co-located with its styles if specific
- **Data fetching with TanStack Query v5** — never bare `useEffect` + `fetch`; use `useQuery` / `useMutation`
- **MUI v7 styling**: use `sx` prop for component-specific overrides, define typed `Record<string, SxProps<Theme>>` for modular styles
- **MUI v7 slots**: use `slots` and `slotProps` for deep customization of sub-components
- **MUI v7 dark mode**: use `theme.applyStyles('dark', ...)` inside `sx` prop arrays
- **Theme tokens** — use theme spacing (`p: 2` → `theme.spacing(2)`) and palette tokens (`color: 'primary.main'`); avoid hardcoded pixels

## Error Handling

- Backend: typed exceptions (`OrderNotFoundError`, not generic `Exception`)
- HTTP: correct status codes (404 not found, 422 validation, 409 state conflict)
- Never silence exceptions with `except: pass`
- Business errors (e.g., "insufficient stock") are logged warnings, not crashes — the flow allows oversell with warning (see `design.md` of `stock_management`)

## Tests

- 1 test file per module: `test_orders.py` for `orders.py`
- Test name describes the requirement: `test_create_order_invalid_email`
- Mocks for external services (SendGrid, storage) — never real calls in tests
- DB fixtures with automatic rollback per test (use `pytest-asyncio` + session scoping)

## Feature Names (for `specs/<feature>/`)

`snake_case`, use a verb if the feature is a concrete action (`create_order`), a noun if it's a domain (`stock_management`). Must match the `name` in `feature_list.json`.

## Environment Variables

- All secrets and environment-specific config go in `src/.env` — never hardcoded
- `src/.env` is gitignored; document every variable in `src/.env.example` with placeholder values
- `src/.env.example` MUST be kept in sync with `backend/config.py` (the `Settings` class)
- Sensitive fields in `config.py` (passwords, API keys, secret keys) MUST have no default — force config via `.env`
- **`docker-compose.yml`** uses `${VAR:-default}` syntax — reads from `src/.env` automatically, falls back to default if unset
- Both `docker-compose.yml` vars and backend config vars live in the **same `src/.env`** file — single source of truth for the dev environment
- Never commit `src/.env` to the repository

## Commits

Format: `<type>: <feature> - <scope>:` followed by bullet-point body.

Types: `feat` (feature), `fix`, `chore` (meta/maintenance), `docs`, `refactor`, `test`.

First line: `feat: stock_management - frontend and backend:`
Body: blank line then bullet points describing what was done:
```
feat: stock_management - frontend and backend:
- Created the filament and supplies table
- Created and passed all 29 tests
- New views in the dashboard with filament management with slicer settings
```
