# Design — create_order

## Tables (see `docs/data_model.md` for the full schema)

- `customers` (new for this feature)
- `orders` (new for this feature — only columns used up to `status='new'`)
- `order_notes` (new, though not used until Mateo adds a note)

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
