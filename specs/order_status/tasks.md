# Tasks — order_status

## Backend

- [ ] Migration: `order_statuses` table + seed data (R4)
- [ ] SQLAlchemy model `OrderStatus` (R4)
- [ ] Pydantic schemas: `StatusUpdateRequest`, `StatusUpdateResponse`, `OrderDetailResponse`, `OrderStatusResponse` (R1–R6)
- [ ] Valid status transitions map (constant) (R1, R2, R3)
- [ ] `GET /api/orders/{order_id}` — order detail with customer name+email (R6)
- [ ] `PATCH /api/orders/{order_id}/status` — transition validation + update + email (R1, R2, R3, R5)
- [ ] `GET /api/order-statuses` — list valid statuses (R4)
- [ ] Add `send_order_status_change` to `EmailService` interface + `SmtpEmailService` (R5)

## Frontend

- [ ] Add `OrderDetail`, `StatusChangeResponse`, `OrderStatus` types to `api.ts` (R6)
- [ ] Add `fetchOrderDetail`, `updateOrderStatus`, `fetchOrderStatuses` to `api.ts` (R6)
- [ ] Create order detail page at `/dashboard/orders/[id]` with order card (R6)
- [ ] Add status action buttons with conditional rendering per state (R1, R2, R3)
- [ ] Update `ActiveOrdersTable` — make rows clickable, navigate to detail page (R7)
- [ ] Wire mutations with query invalidation on success (R7)

## Tests

- [ ] `test_status_new_to_in_progress` (R1)
- [ ] `test_status_in_progress_to_ready` (R1)
- [ ] `test_status_ready_to_delivered` (R1)
- [ ] `test_status_new_to_cancelled` (R2)
- [ ] `test_status_in_progress_to_cancelled` (R2)
- [ ] `test_status_ready_to_cancelled` (R2)
- [ ] `test_status_new_to_delivered` — 409 (R3)
- [ ] `test_status_delivered_to_anything` — 409 (R3)
- [ ] `test_status_cancelled_to_anything` — 409 (R3)
- [ ] `test_status_change_email_sent` — mock called (R5)
- [ ] `test_order_detail_returns_customer_name` (R6)
- [ ] `test_order_statuses_seeded` — verify seed data (R4)

Estimated total: ~8h (backend 4h, frontend 2.5h, tests 1.5h)
