# AGENTS.md

Map for AI agents working in this repository. Does not repeat rules — points
to where they are. Progressive disclosure: read the section that applies to you, not everything.

## Who are you right now?

| If invoked as... | Read | Don't |
|---|---|---|
| `leader` | `.agents/agents/leader.md` | Don't edit code or specs |
| `spec_author` | `.agents/agents/spec_author.md` | Don't write code |
| `implementer` | `.agents/agents/implementer.md` | Don't approve your own work |
| `reviewer` | `.agents/agents/reviewer.md` | Don't edit code |

If you don't know who you are, you're `leader` by default.

## Startup order (local model context efficiency)

1. Read `project_state.md` — summarized source of truth (< 500 tokens)
2. Read `progress/current.md` — active session (< 200 tokens)
3. If implementing: `specs/<feature>/tasks.md`
4. Only if necessary: `specs/<feature>/requirements.md`, `design.md`, `docs/architecture_summary.md`

See `docs/context_policy.md` for the full context budget rules.

## Where everything is

| I need... | Go to... |
|---|---|
| Quick project overview | `project_state.md` |
| Active session status | `progress/current.md` |
| Understand what the product is | `docs/architecture_summary.md` (or `docs/architecture_full.md` for details) |
| Know the SDD process step by step | `docs/specs.md` |
| See the complete data model | `docs/data_model.md` |
| Know code/style conventions | `docs/conventions.md` |
| Know how to verify something "works" | `docs/verification.md` |
| Know if a feature is ready to merge | `CHECKPOINTS.md` |
| See specs for a specific feature | `specs/<feature>/` |
| See past sessions | `progress/archive/history.md` (only when explicitly needed) |
| Context budget rules | `docs/context_policy.md` |

## Principles

- Read the minimum number of files possible.
- Never load the entire repository.
- Search before reading.
- Prefer summaries over raw documents.
- Re-read files only when necessary.
- Keep context budgets small.
- Avoid carrying historical information in the conversation.
- Summarize frequently.

## Mandatory full‑stack rule

Every feature MUST impact both backend and frontend. A feature is not complete
until it has a working UI. If a feature is purely backend (e.g., a library
refactor), document why in the spec.

## Commit rule

Whenever the human asks you to make a commit, do this FIRST:

1. Append a session entry to `progress/archive/history.md` (date, feature,
   transition, summary of what was implemented/committed) — archive first,
   commit second.
2. Then make the commit, following the git rules in your system prompt
   (inspect status/diff/log, stage only intended files, no secrets, concise
   message matching repo style).
3. `history.md` is included in the commit when it changed.

If work spans multiple features or includes pre-existing uncommitted changes,
split into one commit per logical group.

## Anti-telephone-game rule

Don't copy specs, code, or long results into the chat. Write to disk and
return a reference:

```
✓ spec ready → specs/generate_budget/{requirements,design,tasks}.md
✓ implemented → progress/impl_generate_budget.md
```

The human reads the files directly in their editor.
