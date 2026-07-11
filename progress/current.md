# Progress — Active Session

```json
{
  "active_feature": "create_order",
  "state": "spec_ready",
  "waiting": "human review by Dev"
}
```

## Plan

1. [x] `spec_author` wrote `specs/create_order/{requirements,design,tasks}.md`
2. [ ] Dev reviewed and approved (or requested changes)
3. [ ] Leader passed `create_order` to `in_progress`
4. [ ] `implementer` follows `tasks.md`
5. [ ] `reviewer` validates traceability

## Blockers

None.

## Notes

- This is the first feature of the MVP — the rest (`order_status`,
  `generate_budget`, etc.) depend on this being `done`, according
  to `depends_on` in `feature_list.json`.
