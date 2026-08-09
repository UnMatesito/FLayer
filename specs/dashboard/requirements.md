# Requirements — dashboard

Home overview page + new tenant-scoped aggregation endpoint. Replaces the
cluttered `src/app/dashboard/page.tsx` (greeting/logout, store link, order
form, order table) with a mission-control style readout, and relocates the
order form/table/store link to a proper orders hub.

## R1. Summary endpoint requires authentication

GIVEN a request to `GET /api/dashboard/summary` without a valid operator session
WHEN the request reaches the backend
THEN the response is HTTP 401 Unauthorized
AND no aggregation is computed or returned

## R2. KPI aggregates are computed for the operator's own data

GIVEN an authenticated operator whose tenant has orders (various statuses),
    budgets, filaments, supplies, and printers
WHEN they request `GET /api/dashboard/summary`
THEN the `kpis` object reports exactly: `orders_month` (orders created in the
    current UTC calendar month), `revenue_month` (sum of final value of those
    orders, excluding `cancelled`), `pending_orders` (count of `new` + `quoting`),
    `printing_orders` (count of `printing`), `budgeted_value_quoting` (sum of
    the latest budget `final_price` of `quoting` orders),
    `low_stock_filaments`, `low_stock_supplies`, `printers_active`, and
    `maintenance_month` (maintenance records this month on active printers)
AND every count and sum matches the operator's own rows

## R3. Tenant isolation

GIVEN another user owns orders, budgets, filaments, supplies, and printers
WHEN the authenticated operator requests `GET /api/dashboard/summary`
THEN `kpis`, `activity`, `recent_orders`, `low_stock`, and `printers` reflect
    only the operator's own data
AND none of the other tenant's rows contribute to any count or sum

## R4. Revenue is the order's final value, budgets override order totals

GIVEN orders created in the current UTC calendar month, where one has a latest
    budget with `final_price` 1000 and no `orders.total`, another is a product
    order with `orders.total` 200 and no budget, a third has neither a budget
    nor a total, and a fourth is `cancelled` with a budget `final_price` 500
WHEN the operator requests `GET /api/dashboard/summary`
THEN `kpis.revenue_month` equals 1200
AND the value of the order with neither budget nor total contributes 0
AND the `cancelled` order contributes 0

## R5. Activity time series covers exactly the last 14 days, zero-filled

GIVEN orders created on some days within the last 14 UTC days (including today)
    and no orders on the remaining days
WHEN the operator requests `GET /api/dashboard/summary`
THEN `activity` has exactly 14 entries, one per day, ordered oldest to newest,
    ending with today
AND each entry's `orders` counts the non-`cancelled` orders created that day
AND each entry's `revenue` is the sum of final value of those orders
AND a day with no orders reports `orders: 0` and `revenue: 0`
AND `cancelled` orders are excluded from both `orders` and `revenue`

## R6. Recent orders returns the five most recent active orders

GIVEN seven non-`cancelled` orders created at different times and two
    `cancelled` orders with recent timestamps
WHEN the operator requests `GET /api/dashboard/summary`
THEN `recent_orders` returns exactly the 5 most recently created non-`cancelled`
    orders, ordered by `created_at` descending
AND each item includes `id`, `short_id` (first 8 hex chars of the id),
    `customer_name`, `work_type`, `status`, `final_value`, and `created_at`
AND none of the `cancelled` orders appear

## R7. Low-stock list reflects stock below the warning threshold

GIVEN an active filament whose `weight_grams` is below `min_stock_warning_grams`,
    an active supply whose `quantity` is below `min_stock_warning`, and other
    filaments/supplies at or above their thresholds
WHEN the operator requests `GET /api/dashboard/summary`
THEN `low_stock.filaments` lists only the filament below its threshold and
    `low_stock.supplies` lists only the supply below its threshold
AND when no item is below its threshold, both arrays are empty

## R8. Printer bay lists only active printers with per-printer maintenance

GIVEN active printers (some with maintenance records in the current UTC month)
    and an inactive (archived) printer with recent maintenance
WHEN the operator requests `GET /api/dashboard/summary`
THEN `printers` lists only the active printers with `id`, `name`, `brand`,
    `model`, and `maintenance_month` (count of their maintenance records in the
    current month)
AND `kpis.printers_active` equals the number of active printers
AND `kpis.maintenance_month` equals the total of those per-printer counts
AND the archived printer appears in neither `printers` nor the totals

## R9. UI — home page is a mission-control readout built on the summary endpoint

GIVEN an authenticated operator opens `/dashboard`
WHEN the page loads
THEN it renders, from a single `fetchDashboardSummary()` call, the signature
    layer-bar chart (14 days of activity), a four-cell KPI row (pedidos,
    ingresos, en cola, stock bajo), a recent-orders queue, a low-stock panel,
    a printer bay, and quick actions linking to existing pages
AND loading shows a skeleton state, a failed request shows a retry action, and
    an empty tenant shows directional copy with a "Crear pedido" call to action
    (empty and error states as direction, not mood)
AND the page is responsive down to mobile and respects reduced motion

## R10. UI — orders form, table, and store link move to an orders hub

GIVEN the operator navigates to `/dashboard/orders`
WHEN the page renders
THEN it hosts the internal order form, the full orders table, and the store
    link (the three items removed from the old home page), and the dashboard
    sidebar gets a "Pedidos" nav item
AND the quick action on the home page navigates to this hub
AND no existing route breaks: orders table rows still open `/dashboard/orders/{id}`

## R11. Profile branding endpoints require a verified session

GIVEN a request to `PATCH /api/auth/me`, `POST /api/auth/me/logo`, or
    `DELETE /api/auth/me/logo` without a valid verified session
WHEN the request reaches the backend
THEN the response is HTTP 401 Unauthorized
AND no profile field is changed and no file is saved

## R12. PATCH /me updates name and primary color

GIVEN an authenticated verified user with an existing profile
WHEN they send `PATCH /api/auth/me` with `name` and/or `primary_color`
THEN the provided fields are persisted
AND the response (`UserResponse`) reflects the updated values
AND any field omitted from the request stays unchanged
AND an empty or whitespace-only `name` is rejected with HTTP 422

## R13. Invalid primary color rejected

GIVEN an authenticated verified user sending `PATCH /api/auth/me`
WHEN `primary_color` is present and is not a 7-character `#RRGGBB` hex string
    (including an empty string)
THEN the response is HTTP 422
AND the stored value is unchanged

## R14. Primary color can be cleared

GIVEN a user whose `primary_color` is set
WHEN they send `PATCH /api/auth/me` with `primary_color: null`
THEN the stored value becomes null
AND `GET /api/auth/me` returns `primary_color: null`
AND the frontend restores the default accent

## R15. Register accepts an optional primary color

GIVEN a user registering via `POST /api/auth/register`
WHEN `primary_color` is included and is a valid `#RRGGBB` hex string
THEN the user is created with that color stored
AND the register response includes `primary_color`
AND when the field is omitted it is stored as null
AND when present but invalid the response is HTTP 422 and no user is created

## R16. Logo upload sets and replaces the business logotype

GIVEN an authenticated verified user
WHEN they upload a jpeg/png/webp image of at most 10 MB as multipart to
    `POST /api/auth/me/logo`
THEN the file is validated and saved through the existing `storage_service`
AND the user's stored logo path is set
AND `GET /api/auth/me` returns a `logo_url` pointing at the saved file
AND a subsequent upload replaces the previous file and its stored path

## R17. Logo upload validation (negative)

GIVEN an authenticated verified user uploading a logo
WHEN the file type is not jpeg/png/webp or the file is larger than 10 MB
THEN the response is HTTP 422
AND no file is saved
AND any previously stored logo remains intact and unchanged

## R18. Logo removal

GIVEN a user with a stored logo
WHEN they send `DELETE /api/auth/me/logo`
THEN the stored logo path is cleared and the saved file is removed from disk
AND `GET /api/auth/me` returns `logo_url: null`

## R19. GET /me returns the branding fields

GIVEN an authenticated verified user with a `primary_color` and/or a logo
WHEN they request `GET /api/auth/me`
THEN the response includes `primary_color` and `logo_url`
AND `logo_url` is derived from the stored `logo_path` and is null when none
AND the raw `logo_path` is never exposed in the response

## R20. UI — logotype replaces the wordmark; Maker's name in the home greeting

GIVEN an authenticated user whose `logo_url` is set
WHEN the dashboard layout renders
THEN the sidebar nav header and the AppBar toolbar show the business logotype
    image instead of the "Flayer" wordmark
AND when `logo_url` is null both elements fall back to the "Flayer" wordmark
AND the Maker's `name` appears in the home page greeting (and nowhere in the
    sidebar nav header)

## R21. UI — the user's accent drives the dashboard theme

GIVEN a user whose `primary_color` is set
WHEN the dashboard renders
THEN the MUI theme's primary accent — the signature chart "today" bar, KPI
    emphasis, active nav state, and primary actions — uses the user's color
AND when `primary_color` is null the default accent (`ember`) is used
AND an update to the color is reflected immediately without a full reload

## R22. UI — profile page for branding

GIVEN the operator opens the profile page (`/dashboard/profile`)
WHEN they edit their name, pick a primary color (valid hex only), or upload /
    remove a logo
THEN the changes persist via `PATCH /api/auth/me` and the logo endpoints
AND invalid hex, invalid file type, and oversized files show inline errors
AND the nav header, greeting, and theme update immediately after saving

## R23. No cross-user profile access

GIVEN user A and user B with different branding values
WHEN A requests `GET /api/auth/me` or edits branding via the profile endpoints
THEN only A's own branding is returned or modified
AND profile endpoints accept no user target parameter and reject unknown body
    fields with HTTP 422 (no cross-user access path exists)

## Related / dependency note

`dashboard` is the declared dependency of the future `reports` feature
(`feature_list.json`). The aggregation logic must live in a backend service
(not inline in the router) so `reports` can reuse the batched query layer.