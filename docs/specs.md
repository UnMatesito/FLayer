# Spec Driven Development — Process

## Why?

The developer works solo, part-time (4-7h/week), in separate sessions
spread across days. The spec is what survives between sessions — the code can
be regenerated, the business decision does not.

## Flow

```
feature_list.json: "pending"
         │
         ▼
   [spec_author]
   writes requirements.md + design.md + tasks.md
         │
         ▼
feature_list.json: "spec_ready"
         │
         ▼
   ⏸ PAUSE — human review (read requirements.md + design.md + tasks.md)
         │
    ┌────┴────┐
    ▼         ▼
"request changes"  "approved"
    │              │
    ▼              ▼
spec_author    feature_list.json: "in_progress"
reviews             │
                    ▼
              [implementer]
              TDD: RED → GREEN, task per task
              progress/impl_<feature>.md
                    │
                    ▼
              [reviewer]
              verifies R<n> ↔ test, tasks [x]
              review outcome (doc or inline) ←
                    │
              ┌─────┴─────┐
              ▼           ▼
         "rejected"  "approved"
              │           │
              ▼           ▼
        implementer   feature_list.json: "done"
        with feedback  progress/history.md += entry
```

## Review outcome — doc only when it has content

The reviewer creates `progress/review_<feature>.md` **only when** the review
produced recommended changes (a rejection, or non-blocking hardening notes
worth recording). A clean approval with nothing to report gets no review doc —
the verdict is recorded inline in `progress/impl_<feature>.md`:

```markdown
## Reviewer verdict
APPROVED — no recommended changes, no review doc created (date)
```

This keeps the repo clean: a review doc exists **iff** something needs to be
looked at again. The leader and `CHECKPOINTS.md` treat either form (review doc
or inline verdict) as proof the review happened.

## EARS — Requirements Notation

Format:
```
R<n>. GIVEN <initial condition>
      WHEN <event>
      THEN <expected result>
      AND <optional additional validation>
```

Rules:
- Every `R<n>` must be verifiable with an automated test, without ambiguity.
- Nothing like "the system should be able to..." — it's "WHEN X THEN Y", point.
- One requirement, one behavior. If you need "and also...", it's another `R<n>`.

### Example (feature `create_order`)

```
R1. GIVEN a customer accessing the public form
    WHEN they complete all required fields and submit
    THEN a new order is created in 'new' status
    AND the email "Order Received" is sent

R2. GIVEN the form has an empty or invalid email field
    WHEN the customer tries to submit
    THEN the form rejects the submit
    AND no order is created
```

## design.md — What's Inside

- DB tables involved (or reference to `docs/data_model.md`)
- Endpoints if applicable (method, route, request/response)
- Technical decisions with discarded alternatives: *"Considered X, chose Y because Z"*
- Flow diagrams if the feature has more than 3 steps

## tasks.md — What's Inside

Executable checklist, no prose. Each task:
- Duration: 1-3 hours
- References the `R<n>` that covers it
- Markable `[ ]` → `[x]`:

```markdown
- [ ] Table migration: `orders` table (R1)
- [ ] POST /orders with email validation (R1, R2)
- [ ] Template + email: "order received" (R1)
- [ ] Tests: test_create_order_valid, test_create_order_invalid_email (R1, R2)
```

## Human Approval

Developer reads `specs/<feature>/{requirements,design,tasks}.md` in their editor and responds in the chat: **"approved"** or **"change X"**. No implicit approval — without that word, the leader does not advance `feature_list.json` to `in_progress`.

## Closing Traceability

`progress/impl_<feature>.md` must have a clear traceability map:

```
R1 ← test_create_order_valid
R2 ← test_create_order_invalid_email
```

The reviewer rejects if any `R<n>` does not have a test, without exceptions.
