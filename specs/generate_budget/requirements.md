# Requirements — generate_budget

## R1. Budget — Multi-filament selection

GIVEN the operator is creating a budget for an order
WHEN he selects one or more filaments from the product catalog
THEN each filament line stores: product reference, grams used, snapshot unit price, and calculated cost
AND the total filament cost is the sum of all items

## R2. Budget — Manual filament cost

GIVEN the operator does not know which filaments will be used
WHEN creating the budget
THEN he can enter a manual filament cost as a single number
AND the manual cost overrides the multi-filament calculation

## R3. Budget — Auto-calculation

GIVEN the operator enters filament cost (from items or manual), print time (hours + minutes), and extra costs
WHEN the budget is created or updated
THEN the system calculates:
     electricity_cost, amortization_cost, subtotal,
     subtotal_with_error, total_before_margin, and final_price
AND the full breakdown is displayed
AND MercadoLibre price is shown as a convenience (final_price × 1.30)

Formula (hardcoded, not stored in DB):
```
filament_total          = sum of filament items OR manual_filament_cost
electricity_cost       = (hours + min/60) × (machine_wattage / 1000) × electricity_price_kwh
amortization_cost      = (hours + min/60) × (machine_cost / machine_lifespan_hours)
subtotal               = filament_total + electricity_cost + amortization_cost
subtotal_with_error    = subtotal × (1 + error_margin_percent / 100)
total_before_margin    = subtotal_with_error + extra_costs
final_price            = total_before_margin × margin_multiplier
```

Hardcoded defaults (ARS, Argentina market):
| Parameter | Value |
|---|---|
| electricity_price_kwh | 140.00 |
| machine_wattage | 120 W |
| machine_cost | 150,000 |
| machine_lifespan_hours | 4,320 h |
| error_margin_percent | 5% |
| margin_multiplier_wholesale | 3.00 |
| margin_multiplier_retail | 4.00 |
| margin_multiplier_keychain | 5.00 |

## R4. Budget — Manual price override

GIVEN the budget has been auto-calculated
WHEN the operator enters a manual final price
THEN the manual price overrides the calculated final_price
AND the calculated price is displayed for reference

## R5. Budget status — Draft

GIVEN a budget is first created for an order
THEN its status is `draft`
AND it is only visible to the operator
AND the client is not notified

## R6. Budget status — Send to client

GIVEN the budget is in `draft` status
WHEN the operator clicks "Send to Client"
THEN the status changes to `sent`
AND an email is sent to the client with the budget summary
AND `sent_at` is recorded

## R7. Budget status — Approve/Reject

GIVEN the budget is in `sent` status
WHEN the operator marks it as approved
THEN the status changes to `approved`
AND the order status changes to `approved`

GIVEN the budget is in `sent` status
WHEN the operator marks it as rejected
THEN the status changes to `rejected`
AND the operator can create a new budget version for the same order

## R8. Generate budget — Invalid inputs

GIVEN the operator enters grams ≤ 0 for any filament item, hours < 0, or extra_costs < 0
WHEN he tries to generate a budget
THEN the form rejects the input with a clear validation message
AND no budget is created

## R9. Budget visibility — Order detail

GIVEN an order has a budget
WHEN the operator views the order detail
THEN he sees: budget status, full cost breakdown, final price, and MercadoLibre price
AND the filament items used are listed
AND the margin multiplier used is displayed
AND extra_costs are shown as a separate line item

## R10. No budget — Empty state

GIVEN an order has no budget yet
WHEN the operator views the order detail
THEN he sees "No budget generated yet" and a button to create one

## Future (not in this feature)

- Configurable hardcoded parameters → `printer_profiles` + user settings
- Client-side budget approval → client portal
- Email template customization → `email_notifications`
- Multiple machine profiles → `printer_profiles`
- Resin printing costs → future feature
- PDF generation of budget → future enhancement
- Configurable defaults per currency → `printer_profiles` + user settings
