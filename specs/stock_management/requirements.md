# Requirements — stock_management

## R1. Create filament

GIVEN the operator is authenticated on the dashboard
WHEN he fills in the filament form (color name, color hex, type, weight in grams,
    price per kg, minimum stock warning) and submits
THEN a new `filaments` record is created
AND the filament appears in the filament list

## R2. List filaments

GIVEN the operator is on the stock page
WHEN the page loads
THEN all active filaments are displayed in a table (color name, color hex swatch, type, weight_grams, price_per_kg, low stock indicator)
AND inactive filaments are hidden by default

## R3. Update filament weight (adjustment)

GIVEN a filament exists
WHEN the operator adjusts its weight (positive or negative delta)
THEN an atomic transaction updates `filaments.weight_grams`
AND a `stock_movements` record is created with `movement_type='adjustment'`
AND the quantity delta is logged

## R4. Create supply

GIVEN the operator is authenticated on the dashboard
WHEN he fills in the supply form (name, quantity, unit, minimum stock warning) and submits
THEN a new `supplies` record is created
AND the supply appears in the supply list

## R5. Update supply quantity

GIVEN a supply exists
WHEN the operator adjusts its quantity
THEN the `supplies.quantity` is updated
AND the previous quantity is overwritten (no audit trail for supplies in MVP)

## R6. Automatic stock deduction on ready

GIVEN an order transitions to status `ready` via `PATCH /api/orders/{order_id}/status`
WHEN the status change is processed
THEN the system atomically deducts the filament weight used by that order from the assigned filament
AND a `stock_movements` record is created with `movement_type='consumption'` and negative `quantity_grams`
AND if stock would go negative, the system LOGS a warning and ALLOWS the deduction (oversell permitted, logged for review)

## R7. Stock reversal on cancellation

GIVEN an order with status `new`, `in_progress`, or `ready` transitions to `cancelled`
WHEN the cancellation is processed
THEN if stock was previously deducted (status was `ready` when cancelled), the system atomically restores the deducted grams
AND a `stock_movements` record is created with `movement_type='reversal'` and positive `quantity_grams`
AND if the order was not yet `ready` (no previous deduction), no stock movement is created

## R8. Stock movement history

GIVEN the operator is on the stock movement log page
WHEN the page loads
THEN all stock movements are displayed in a paginated table (date, filament, type, quantity, order reference, who made it)
AND filters are available by movement type, filament, and date range

## R9. Low stock warnings

GIVEN a filament or supply has `weight_grams` / `quantity` below its configured minimum warning threshold
WHEN the dashboard loads or the stock page is opened
THEN the item is visually flagged (e.g., orange/red indicator, warning chip)
AND a warning icon appears on the stock navigation item

## R10. Insufficient stock on ready transition — Soft warning

GIVEN an order is transitioning to `ready`
WHEN the assigned filament does not have enough weight_grams to cover the order's required grams
THEN the system logs a warning and allows the transition anyway (oversell is permitted)
AND the stock goes negative after deduction (negative weight_grams tracked accurately)

## R11. Invalid movement type rejected

GIVEN a call to create a stock movement
WHEN the `movement_type` is not one of `consumption`, `adjustment`, `reversal`
THEN the API rejects the request with 422 Validation Error

## R12. Filament soft-delete (archive)

GIVEN the operator archives a filament
WHEN he clicks "Archive" on the filament row
THEN `filaments.is_active` is set to `false`
AND the filament no longer appears in the default filament list
AND existing stock movements referencing this filament remain intact

## Out of scope

- Re-opening a cancelled order → explicit new order creation
- Automatic purchase order generation when stock is low → future feature
- Barcode / QR scanning for filament tracking → future feature
- Multi-filament orders (an order using multiple spools) → MVP assumes one filament per order via `filament_id` on `orders`
- Batch import/export of stock data → future feature
- Stock forecasting or historical trend charts → future feature
