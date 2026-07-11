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

## Before touching anything

1. Read `feature_list.json` — it's the real project state.
2. Read `progress/current.md` — it's the active session (if it exists).
3. Hard rule: **there can never be more than 1 feature `in_progress`**.

## Where everything is

| I need... | Go to... |
|---|---|
| Understand what the product is | `docs/architecture.md` |
| Know the SDD process step by step | `docs/specs.md` |
| See the complete data model | `docs/data_model.md` |
| Know code/style conventions | `docs/conventions.md` |
| Know how to verify something "works" | `docs/verification.md` |
| Know if a feature is ready to merge | `CHECKPOINTS.md` |
| See specs for a specific feature | `specs/<feature>/` |
| See what happened in previous sessions | `progress/history.md` |

## Anti-telephone-game rule

Don't copy specs, code, or long results into the chat. Write to disk and
return a reference:

```
✓ spec ready → specs/generate_budget/{requirements,design,tasks}.md
✓ implemented → progress/impl_generate_budget.md
```

The human (Mateo) reads the files directly in their editor.
