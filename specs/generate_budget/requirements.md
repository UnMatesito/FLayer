# Requirements — generate_budget

*This feature merges `generate_budget` and `region_parameters` into one.*

## R1. Budget parameters — Configure material costs

GIVEN the operator is authenticated on the dashboard
WHEN he navigates to the budget parameters settings
THEN he can set the filament price per kilogram
AND the value is persisted and used in all subsequent budget calculations

## R2. Budget parameters — Configure operating costs

GIVEN the operator is on the budget parameters settings
WHEN he enters electricity price per kWh, machine wattage, machine purchase cost, and machine lifespan in hours
THEN all values are persisted and used in budget calculations

## R3. Budget parameters — Configure margins

GIVEN the operator is on the budget parameters settings
WHEN he enters error margin percentage and margin multipliers (wholesale, retail, keychain)
THEN the values are persisted and applied in the budget formula

## R4. Budget parameters — Default values

GIVEN no budget parameters have been configured yet
WHEN the operator generates the first budget
THEN sensible defaults are used so the system does not crash or produce zero prices

## R5. Generate budget — Auto-calculation

GIVEN the operator is generating a budget for an order
WHEN he enters filament weight (grams) and print time (hours + minutes)
THEN the system calculates:
     filament_cost, electricity_cost, amortization_cost, subtotal,
     subtotal_with_error, and final_price using the configured parameters
AND the full breakdown is displayed in the budget form

## R6. Generate budget — Manual price override

GIVEN the budget has been auto-calculated
WHEN the operator enters a manual final price
THEN the manual price overrides the calculated final_price
AND the budget shows both the calculated price and the manual price for reference

## R7. Budget status — Draft

GIVEN a budget is first created for an order
THEN its status is `draft`
AND it is only visible to the operator
AND the client is not notified

## R8. Budget status — Send to client

GIVEN the budget is in `draft` status
WHEN the operator clicks "Send to Client"
THEN the status changes to `sent`
AND an email is sent to the client with the budget summary
AND `sent_at` is recorded

## R9. Budget status — Approve/Reject

GIVEN the budget is in `sent` status
WHEN the operator marks it as approved
THEN the status changes to `approved`
AND the order status changes to `approved`

GIVEN the budget is in `sent` status
WHEN the operator marks it as rejected
THEN the status changes to `rejected`
AND the operator can create a new budget version for the same order

## R10. Budget parameters — Invalid values

GIVEN the operator enters a negative value or zero for any numeric parameter
WHEN he tries to save
THEN the form rejects the input with a clear validation message
AND the invalid value is not persisted

## R11. Generate budget — Invalid inputs

GIVEN the operator enters grams ≤ 0 or hours < 0
WHEN he tries to generate a budget
THEN the form rejects the input with a clear validation message
AND no budget is created

## R12. Budget visibility — Order detail

GIVEN an order has a budget
WHEN the operator views the order detail
THEN he sees: budget status, full cost breakdown, and final price
AND the margin multiplier used is displayed

## R13. No budget — Empty state

GIVEN an order has no budget yet
WHEN the operator views the order detail
THEN he sees "No budget generated yet" and a button to create one

## Out of scope for this feature

- Client-side budget approval (client portal) → future feature
- Email template customization for budget notification → `email_notifications`
- Multiple machine profiles → hardcoded single profile for MVP
- Resin printing costs → only FDM for MVP
- PDF generation of budget → future enhancement (screen display only)
- Currency selection → defaults to configured locale (ARS/USD)
