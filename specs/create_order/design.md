# Design — create_order

## Tables (see `docs/data_model.md` for the full schema)

- `customers` (new for this feature)
- `orders` (new for this feature — only columns used up to `status='new'`)
- `order_notes` (new, though not used until the operator adds a note)

`order_status_history` is not created here — that belongs to `order_status`. However,
the `orders.status` column does exist from this feature (default `'new'`).

## Endpoints

| Method | Route | Usage |
|---|---|---|
| `POST` | `/api/public/orders` | Public form (R1, R2, R3, R4) |
| `POST` | `/api/orders` | Manual creation, requires auth (R5) |
| `GET` | `/api/orders?status=active` | Active orders table (R6) |

### `POST /api/public/orders` — Request

```json
{
  "customer": { "name": "...", "email": "...", "phone": "..." },
  "work_type": "impresion_3d | diseno_3d",
  "description": "...",
  "files": [{ "filename": "...", "url": "..." }]
}
```

### Validations (R3, R4)

- Email: standard regex + Pydantic `EmailStr`
- Name: non-empty, trimmed
- File: max size 200MB validated before upload (client + server)

## Technical decisions

**Customer is created or reused (not always new).**
Discarded alternative: create a new `customer` for every order. Chosen:
lookup by `email` within the same `user_id`; if exists, reuse
(`UNIQUE(user_id, email)` on `customers`). Avoids duplicate returning customers.

**Files: reference only, no actual upload in this feature.**
The `files` field on `orders` is JSONB with `{filename, url}`. Actual upload
to storage (S3/local) is an infrastructure concern that does not block
this feature — MVP can accept an external link (Drive, WeTransfer) as
a valid `url`. If self-hosted upload is added later, it's an additional
endpoint that populates the same field.

**"Already notified the client" (R5) is a checkbox, not real dedup logic.**
Discarded alternative: track whether the email was sent and prevent
duplicates automatically. Chosen: trust the operator because MVP is
single-user and volume is low (~3 orders/month). Revisit if multi-user.

## Email trigger

This feature calls `email_service.send_order_received(order)` but
**does not implement the email service itself** — that's the responsibility of
`email_notifications`. Here, a simple mock/interface is used:
`EmailService.send(template, to, context)` with real implementation
injected later. Tests for this feature mock `EmailService`.

## Store-token hardening (R7, revision 2026-08-12)

The public endpoints were originally designed to accept token-less intake via
`ANONYMOUS_USER_ID` in `public_store.resolve_user_id_from_token`. Human
decision: intake is only via the shared store link (token) or manual entry —
the anonymous mode is plumbing for a flow that no longer exists and it
fabricates user rows. Defense-in-depth closes it:

- `public_store.py` — `resolve_user_id_from_token`: `token=None` → 404
  "Invalid store token", same response as an unknown token (no scraping
  signal). `ANONYMOUS_USER_ID` removed.
- `orders.py` — `create_public_order`: drop the fabricated-anonymous-user
  branch (lines 172–182); a token whose user is missing → 404, never fabricate.
- `products.py` — `list_public_products` needs no local change (it routes
  through the shared resolver, which now 404s token-less calls).
- Store-token endpoints (owner-only), internal endpoints (cookie auth), email
  flow: untouched.

**Test impact**: the three schema-level 422 tests (invalid email, empty name,
>10 files) validate before the handler runs, so they stay token-less and keep
passing. The four 201 tests in `TestCreateOrderPublic` must attach a valid
store token (new `StoreTokenFactory` + fixture). New tests: missing-token →
404 and unknown-token → 404 for both `/api/public/orders` and
`/api/public/products`.
