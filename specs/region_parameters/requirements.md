# Requirements — region_parameters

Makes the 5 configurable budget parameters (`electricity_price_kwh`,
`error_margin_percent`, `margin_multiplier_wholesale`, `margin_multiplier_retail`,
`margin_multiplier_keychain`) user-configurable, per currency. The pre-feature
hardcoded defaults in `budget_service.py` are **eliminated**: every read and
every calculation is backed by a `budget_parameters` DB row, seeded on first
access with the former default values and then editable by the operator.
Machine parameters (`power_watts`, `lifespan_hours`, `spare_parts_cost`) stay
printer-profile-driven — out of scope.

## R1. First access seeds default rows

GIVEN an authenticated operator who has no `budget_parameters` rows
WHEN they request `GET /api/budget-parameters`
THEN the response contains the five parameters for ALL SIX currencies
    (`ARS`, `USD`, `EUR`, `BRL`, `GBP`, `MXN`) with the default values
    (ARS: electricity 140.00, USD: 0.15, EUR: 0.25, BRL: 0.80, GBP: 0.25,
    MXN: 2.50; margins always 5.00/3.00/4.00/5.00)
AND a `budget_parameters` row is created for each `(user, currency)`
AND each entry is marked `is_default: true`

## R2. Read effective parameters — saved row wins

GIVEN an authenticated operator who has a customized `budget_parameters` row for `ARS`
WHEN they request `GET /api/budget-parameters`
THEN the `ARS` entry contains the saved values with `is_default: false`
AND the `USD` entry still shows the seeded values with `is_default: true`

## R3. Upsert parameters — create

GIVEN an authenticated operator with no `budget_parameters` row for `USD`
WHEN they `PUT /api/budget-parameters/USD` with the five fields
THEN a `budget_parameters` row is created for `(user, USD)` with those values
    and `is_default: false`
AND the response returns the saved row with `is_default: false`
AND the `GET` from R1 now returns those values for `USD`

## R4. Upsert parameters — update

GIVEN an existing `budget_parameters` row for `(user, ARS)`
WHEN the operator `PUT /api/budget-parameters/ARS` with new values
THEN the row is updated in place (same `id`, `created_at` unchanged)
AND `updated_at` refreshes
AND `is_default` becomes `false` (the values are now customized)
AND the response returns the updated values

## R5. Validation — all fields required and within range

GIVEN the operator is sending `PUT /api/budget-parameters/{currency}`
WHEN any field is missing, or
    `electricity_price_kwh <= 0` or `> 10000`,
    `error_margin_percent < 0` or `> 100`,
    any multiplier `<= 0` or `> 100`
THEN the request is rejected with HTTP 422
AND no row is created or modified

## R6. Validation — invalid currency

GIVEN the operator requests `PUT /api/budget-parameters/{currency}`
WHEN `currency` is not one of the six supported currencies (`ARS`, `USD`,
    `EUR`, `BRL`, `GBP`, `MXN`)
THEN the request is rejected with HTTP 422
AND no row is created or modified

(Note: `GET /api/budget-parameters` takes no currency input — it always
returns all six currencies, so this requirement only applies to `PUT`.)

## R7. Tenant isolation

GIVEN a `budget_parameters` row belonging to another user
WHEN the authenticated operator requests `GET /api/budget-parameters` or
    `PUT /api/budget-parameters/{currency}`
THEN the other user's values never appear in the response
AND a `PUT` from the operator never modifies the other user's row
    (it upserts the operator's own row)

## R8. Budget calculation uses configured parameters

GIVEN an operator who has a `budget_parameters` row for the budget's currency
WHEN they create, update, or preview a budget in that currency
THEN the calculation uses the row's `electricity_price_kwh`,
    `error_margin_percent`, and the multiplier matching `margin_type`
    (`wholesale`/`retail`/`keychain`)
AND the snapshot columns on the new budget row record the values actually used
    (`error_margin_percent`, `margin_multiplier`, `electricity_price_kwh`)

## R9. Unconfigured users calculate with the seeded values

GIVEN an operator whose `budget_parameters` rows are still seeded
    (never customized)
WHEN they create, update, or preview a budget in a given currency
THEN the calculation uses exactly the same values as before this feature
    (the seeded values equal the pre-feature defaults for that currency)
AND the result is identical to the pre-feature result for the same inputs

## R10. Existing budgets are immutable snapshots

GIVEN an existing budget whose calculation used custom or seeded parameters
WHEN the operator later edits their `budget_parameters`
THEN the stored budget (`final_price`, snapshots) does not change
AND reading the budget displays intermediate costs computed from the
    snapshotted parameters, never from the current parameters
    (a `NULL` `electricity_price_kwh` snapshot — pre-feature budget — is
    resolved to the seeded value for `(user, currency)` at read time)

## R11. Budget currency defaults to the user's currency

GIVEN an authenticated operator whose default currency is `USD`
WHEN they create a budget (or request a preview) omitting `currency`
THEN the budget is created with `currency = "USD"`
AND the calculation uses the `USD` parameters

## R12. Budget explicit currency still respected

GIVEN an authenticated operator whose default currency is `ARS`
WHEN they create a budget (or request a preview) with `currency: "USD"`
THEN the budget uses `USD` as today

## R13. User profile exposes default currency

GIVEN an authenticated operator
WHEN they request `GET /api/auth/me`
THEN the response includes `currency` (one of `ARS`, `USD`, `EUR`, `BRL`,
    `GBP`, `MXN`)
AND it matches the operator's `users.currency` column (default `ARS`)

## R14. Update default currency

GIVEN an authenticated operator
WHEN they `PATCH /api/auth/me` with `{ "currency": "USD" }`
THEN `users.currency` is updated to `USD`
AND `GET /api/auth/me` returns `currency: "USD"` afterwards
AND a request with any value outside the six supported currencies is
    rejected with HTTP 422

## R15. UI — "Parámetros del Maker" block in the existing Perfil page

GIVEN the operator opens the Perfil page in the dashboard (the page already
    exists since `dashboard` — name, accent color, logo blocks)
WHEN the page loads
THEN it shows the five parameters for all six currencies with a currency
    toggle as a new block titled "Parámetros del Maker" (the existing profile
    blocks remain untouched)
AND the parameters initially point to the operator's default currency (the
    toggle starts on `users.currency`), and saving a new default currency
    switches the visible parameters to that currency
AND the fields are prefilled from `GET /api/budget-parameters` (R1, R2)
    and can be edited and saved per currency (a "Guardar" action calls
    `PUT /api/budget-parameters/{currency}`)
AND a currency entry marked `is_default: true` shows a hint that the default
    values are in use
AND the form rejects a submit with out-of-range values using the same rules
    as R5 (frontend validation, mirrored by the backend)

## R16. UI — default currency selector

GIVEN the operator is on the Perfil page
WHEN they change the "Moneda por defecto" selector and save
THEN `PATCH /api/auth/me` is called with the new currency
AND the page reflects the new default
AND the selector shows the value returned by `GET /api/auth/me` (R13)

## R17. UI — budget form preselects the user's currency

GIVEN the operator opens the budget form for an order
WHEN the currency selector renders
THEN it is preselected to the operator's default currency (from R13) instead of
    a hardcoded `ARS`
AND the operator can still switch to any of the six currencies

## Out of scope

- Registration flow and currency selection at registration → pending feature
  `registration` (`users.currency` is created by THIS feature and is only
  exposed through the Perfil page and the profile endpoint; the pending
  `registration` feature extends the existing `RegisterRequest` to set it at
  registration time)
- Currency conversion of any kind
- Editing the machine parameters (`power_watts`, `lifespan_hours`,
  `spare_parts_cost`) from this page — they belong to printer profiles
  (`printer_profiles`)
- Per-order parameter overrides

## Revision — 2026-09-09: margins leave regional settings

## R18. Regional parameters no longer configure earnings margins

GIVEN an authenticated operator reads or updates `budget_parameters`
WHEN `GET /api/budget-parameters` or `PUT /api/budget-parameters/{currency}` is used
THEN each currency entry contains only `electricity_price_kwh`,
    `error_margin_percent`, `is_default`, and timestamps
AND the old multiplier fields (`margin_multiplier_wholesale`,
    `margin_multiplier_retail`, `margin_multiplier_keychain`) are not accepted
    by the update schema

## R19. Budget calculations use per-budget earnings margins

GIVEN an operator creates, updates, or previews a budget
WHEN the budget has a selected earnings margin preset or custom multiplier
THEN the regional parameter row contributes only `electricity_price_kwh` and
    `error_margin_percent`
AND the earnings multiplier comes from the budget request/default preset, not
    from the regional parameter row
