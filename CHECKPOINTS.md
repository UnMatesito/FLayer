# CHECKPOINTS.md

Objective criteria for "this is good". If not met, it cannot advance.

## Checkpoint: Spec ready for approval (`pending` → `spec_ready`)

- [ ] `requirements.md` has 3+ requirements in EARS notation, numbered `R1, R2, ...`
- [ ] No requirement uses ambiguous language ("could", "maybe", "generally")
- [ ] `design.md` justifies relevant technical decisions (why X and not Y)
- [ ] `tasks.md` is an executable checklist, not prose
- [ ] Each task in `tasks.md` references which `R<n>` it covers
- [ ] Each task is completable in 1-3 hours

## Checkpoint: Code ready for review (`in_progress`, before reviewer)

- [ ] Each `R<n>` in `requirements.md` has at least 1 automated test
- [ ] All tests pass (green)
- [ ] `progress/impl_<feature>.md` maps `R<n> → test`
- [ ] `progress/impl_<feature>.md` lists all files touched
- [ ] Feature coverage > 70%
- [ ] No linter / type-checker warnings

## Checkpoint: Feature complete (`in_progress` → `done`)

- [ ] `progress/review_<feature>.md` exists with verdict "APPROVED"
- [ ] All tasks in `tasks.md` marked `[x]`
- [ ] `feature_list.json` updated to `"status": "done"`
- [ ] `progress/history.md` has session entry

## Executable Verification (`init.sh`)

`init.sh` must fail if:
- There are 2+ features with `"status": "in_progress"`
- A feature with `"sdd": true` doesn't have the 3 files in `specs/<feature>/`
- A feature with `"status": "in_progress"` doesn't have `progress/impl_<feature>.md`
- Tests don't pass
