# Verification — How to Prove It Works

"Compiles" is not enough. Each feature is demonstrated across 3 layers.

## Layer 1: Traceability (Mandatory, Automatable)

Each `R<n>` in `requirements.md` → at least 1 test that exercises it, mapped
explicitly in `progress/impl_<feature>.md`. Without this, the reviewer
rejects automatically — non-negotiable.

## Layer 2: Executed Tests (Mandatory)

```bash
pytest tests/ -v --cov=src --cov-report=term-missing
```

- All green
- Coverage of touched files > 70%
- No tests marked `skip` without a justified comment

## Layer 3: Manual Functional Verification (for features with UI or critical flow)

Before marking `done`, run the real flow at least once:

| Feature | How to Verify Manually |
|---|---|
| `create_order` | Submit real form, confirm row in DB and email received |
| `generate_budget` | Enter known grams/hours, verify calculation by hand vs generated PDF |
| `stock_management` | Deduct stock by order, verify `stock_movements` + updated weight |
| `order_status` | Walk the full cycle new→delivered, verify each triggered email |
| `arquiminis` | Order with custom pack, verify surcharge applied and final price |

This is documented as a short section in `progress/impl_<feature>.md`:
```
## Manual Verification
- [x] Form submitted with real data → order ORD-2026-003 created
- [x] Email received in test inbox (screenshot in progress/assets/ optional)
```

## `init.sh` — Automatic Repo State Verification

Run before any session and before marking a feature `done`:

- Only 1 feature `in_progress` at a time
- Every feature with `sdd: true` has its 3 spec files
- Every feature `in_progress` has `progress/impl_<feature>.md`
- `pytest` passes completely

If `init.sh` is not green, do not advance status in `feature_list.json`.
