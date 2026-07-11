# Conventions — Style, Naming, Errors

## Python (Backend — FastAPI + SQLAlchemy 2.0)

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

## Commits

`<feature>: <action>` — e.g., `create_order: add email validation to public form`
