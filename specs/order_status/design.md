# Design — order_status

## Table

### `order_statuses` (new — lookup catalog)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE | e.g. `new`, `in_progress` |

Seeded with: `new`, `in_progress`, `ready`, `delivered`, `cancelled`. No runtime
modifications in MVP — the table exists as a referential anchor for the `orders.status`
column and for future FK constraints.

No separate history table — the current status on `orders.status` is sufficient
for MVP. The order already carries `user_id` for ownership context.

## Status machine

```
                    ┌──────────┐
                    │   new    │
                    └────┬─────┘
                         │
                    ┌────▼──────┐
                    │ in_progress│
                    └────┬──────┘
                         │
                    ┌────▼───┐
                    │  ready │
                    └────┬───┘
                         │
                    ┌────▼──────┐
                    │ delivered │
                    └───────────┘

Cancellation (from new, in_progress, ready):
                    ┌────────────┐
                    │ cancelled  │
                    └────────────┘
```

**Valid transitions (enforced by the API):**

| From | To |
|---|---|
| `new` | `in_progress`, `cancelled` |
| `in_progress` | `ready`, `cancelled` |
| `ready` | `delivered`, `cancelled` |
| `delivered` | (none — terminal) |
| `cancelled` | (none — terminal) |

Any transition not in this table → 409 Conflict with detail listing valid target statuses.

## Endpoints

| Method | Route | Auth | Usage |
|---|---|---|---|
| `GET` | `/api/orders/{order_id}` | Yes | Get order detail (R6) |
| `PATCH` | `/api/orders/{order_id}/status` | Yes | Change status (R1, R2, R3) |
| `GET` | `/api/order-statuses` | Yes | List valid statuses (R4) |

### `GET /api/orders/{order_id}` — Response

Extends `OrderResponse` with customer name and email:

```json
{
  "id": "...",
  "customer_id": "...",
  "customer_name": "Juan Pérez",
  "customer_email": "juan@example.com",
  "work_type": "impresion_3d",
  "description": "...",
  "files": [...],
  "status": "in_progress",
  "client_notified": true,
  "created_at": "...",
  "updated_at": "..."
}
```

### `PATCH /api/orders/{order_id}/status` — Request

```json
{
  "status": "in_progress"
}
```

### `PATCH /api/orders/{order_id}/status` — Response (200)

```json
{
  "id": "...",
  "status": "in_progress"
}
```

On success:
1. Validates transition against the machine (R3)
2. Updates `orders.status`
3. Calls `email_service.send_order_status_change(order, new_status, customer_email)` (R5)
4. Returns updated status

### `GET /api/order-statuses` — Response

```json
[
  { "id": "...", "name": "new" },
  { "id": "...", "name": "in_progress" },
  { "id": "...", "name": "ready" },
  { "id": "...", "name": "delivered" },
  { "id": "...", "name": "cancelled" }
]
```

## Frontend

### `src/app/dashboard/orders/[id]/page.tsx` — Order detail page (R6)

- Protected route
- Uses `useQuery` to fetch `GET /api/orders/{order_id}`
- **Order card:** customer info, work type, description, files, creation date
- **Status section:**
  - Large status chip with color
  - Action buttons based on current status:
    - `new` → [Start] [Cancel]
    - `in_progress` → [Mark Ready] [Cancel]
    - `ready` → [Mark Delivered] [Cancel]
    - `delivered` → (none)
    - `cancelled` → (none)
  - Buttons use `useMutation` calling `PATCH /api/orders/{order_id}/status`
  - On success: invalidate `['active-orders']` + refetch order
- **Back navigation:** back button to dashboard

### `ActiveOrdersTable.tsx` — Updated (R7)

- Rows are clickable, navigate to `/dashboard/orders/${order.id}`
- Hover cursor pointer

### `api.ts` — Updated

- Add `OrderDetail` interface (extends `Order` with `customer_name`, `customer_email`)
- Add `StatusChangeResponse` interface
- Add `fetchOrderDetail(orderId)` / `updateOrderStatus(orderId, status)` / `fetchOrderStatuses()`

## Email service — New method (R5)

Add to `EmailService` interface and `SmtpEmailService`:

```python
async def send_order_status_change(self, order: Order, new_status: str, to: str) -> None:
    ...
```

A simple text email for MVP. Template customization later in `email_notifications`.
