# Requirements — order_status

## R1. Status transitions — Happy path

GIVEN an order exists with status `new`
WHEN the operator clicks "Start"
THEN the status changes to `in_progress`

GIVEN an order has status `in_progress`
WHEN the operator clicks "Mark as Ready"
THEN the status changes to `ready`

GIVEN an order has status `ready`
WHEN the operator clicks "Mark as Delivered"
THEN the status changes to `delivered`

## R2. Status transitions — Cancellation

GIVEN an order has status `new`, `in_progress`, or `ready`
WHEN the operator clicks "Cancel Order"
THEN the status changes to `cancelled`

## R3. Invalid transitions — Rejected

GIVEN an order has status `new`
WHEN the operator tries to change it to `delivered`
THEN the API rejects the transition with 409 Conflict

GIVEN an order has status `delivered` or `cancelled`
WHEN the operator tries to change it to any other status
THEN the API rejects with 409 Conflict

## R4. Statuses are stored in a lookup table

GIVEN the system has been initialized
THEN the `order_statuses` table contains: `new`, `in_progress`, `ready`, `delivered`, `cancelled`
AND the table serves as a reference catalog (no runtime changes in MVP)

## R5. Email notification on status change

GIVEN a status change occurs to any status (R1, R2)
THEN the system calls `email_service.send_order_status_change(order, new_status, customer_email)`
AND the email includes the new status and a brief message

## R6. Order detail page — Current status

GIVEN the operator opens the order detail page
THEN he sees the order info (customer, work type, description, files) and the current status
AND available action buttons based on the current status
AND muted/disabled buttons for unavailable transitions

## R7. Order navigation — From active orders table

GIVEN the operator sees the active orders table
WHEN he clicks on an order row
THEN it navigates to `/dashboard/orders/{id}`

## Out of scope

- Client-side status polling (auto-refresh) → handled by existing 30s TanStack Query refetch
- Re-opening a cancelled order → explicit new order creation
- Email template customization → `email_notifications`
- Status change as a result of payment/budget approval → cross-feature, handled at integration time
- Status history audit trail → not needed for MVP (current status on order is sufficient)
