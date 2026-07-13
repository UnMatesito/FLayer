# Context Policy

Optimized for local models with limited context (8k–16k tokens).

## Always load (startup)

1. `project_state.md` — summarized project state
2. `progress/current.md` — active session (100–200 tokens)

## Load if necessary

- `specs/<feature>/tasks.md` — when implementing a feature
- `specs/<feature>/requirements.md` — when implementing or reviewing
- `docs/conventions.md` — when writing code

## Rarely load

- `specs/<feature>/design.md` — detailed design decisions
- `docs/architecture_summary.md` — high-level architecture
- `docs/data_model.md` — table schemas
- `docs/specs.md` — SDD process

## Never load by default

- `progress/archive/history.md` — past sessions (consult only when needed)
- `docs/architecture_full.md` — detailed reference
- Entire `docs/` directory
- Entire `specs/` directory
- All feature specifications simultaneously

## Principles

- Read the minimum number of files possible.
- Never load the entire repository.
- Search before reading.
- Prefer summaries over raw documents.
- Re-read files only when necessary.
- Keep context budgets small.
- Avoid carrying historical information in the conversation.
- Summarize frequently.
