# Requirements — app_entry

## Context

The `/` page is currently a marketing-shaped landing (Split Diptych, Boneyard-DNA:
split hero, "Cómo funciona" numbered steps, capability rows, launcher panel).
Flayer is a non-sellable local MVP. The `/` page must be a plain entry point —
logo, one honest line about what the app does, and two paths in (order form for
customers, dashboard for the operator). No selling structure at all. The app also
has no logo mark — this feature adds a reusable `FlayerLogo`.

## R1. Logo in the home header

GIVEN a visitor opens `/`
WHEN the page renders
THEN the header shows the Flayer logo (mark + wordmark) rendered as a link to `/`

## R2. Customer entry action

GIVEN a customer on `/`
WHEN they click "Solicitar un pedido"
THEN they are taken to `/order-form`

## R3. Operator entry action

GIVEN an operator on `/`
WHEN they click "Acceso del taller"
THEN they are taken to `/dashboard`
AND if they are not authenticated, the existing auth guard redirects to `/login`

## R4. No selling content

GIVEN the `/` page
WHEN it renders
THEN it contains no selling content — no feature list, no numbered steps, no
    testimonials, no stats, no pricing, no launcher panel
AND the page consists only of: header (logo + "Acceso del taller" link), a short
    headline with one description line, the two entry actions (R2, R3), and the
    footer line

## R5. Mobile safety

GIVEN the `/` page rendered at any viewport width from 320px up
WHEN the layout reflows
THEN no horizontal scroll occurs
AND every clickable label ("Solicitar un pedido", "Acceso del taller") remains on
    a single line

## R6. Logo uses theme tokens

GIVEN the `FlayerLogo` component
WHEN it is rendered in the light or the dark color scheme
THEN the mark is drawn exclusively with theme tokens (accent / ink / currentColor)
    and contains no hardcoded color literals
AND it remains legible in both schemes

## R7. Dashboard logo fallback

GIVEN an operator without a custom tenant logo (`logo_url` is null)
WHEN the dashboard sidebar Logotype renders
THEN it shows the Flayer logo (mark + wordmark) instead of the current plain-text "Flayer"
AND when a tenant logo URL exists, the uploaded image still takes precedence
    (existing behavior unchanged)

## Out of scope

- Selling / marketing landing content — explicitly out: this page will never sell
- Tenant logo upload UI (exists in profile; untouched)
- Backend changes — none (see design.md for the full-stack rule exception)
- Logo animation, favicon, PWA icons → future

## Related

- `authentication` — dashboard auth guard (R3), `logo_url` source (R7)
- `create_order` — `/order-form` (R2)
- `dashboard` — sidebar Logotype (R7)
