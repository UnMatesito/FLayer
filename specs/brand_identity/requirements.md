# Requirements — brand_identity

## Context

The `/` page is currently a marketing-shaped landing (Split Diptych, Boneyard-DNA:
split hero, "Cómo funciona" numbered steps, capability rows, launcher panel,
customer CTA). Flayer is a non-sellable local MVP. Orders reach the workshop by
exactly two paths: the shared store link (token) that customers open on
`/order-form`, and the operator registering the order manually from the
dashboard (human decision 2026-08-12: `Solicitar un pedido` is removed from `/` —
the form is only reached via the token link or manual entry). The `/` page must
therefore be a plain operator entry point — logo, one honest line about what the
app does, and one path in (the dashboard).

The app has no branded identity in UI — real brand assets now exist in
`public/`: `logo.svg` (isotype) and `iso_black.svg` / `iso_white.svg` (logotype
lockup, scheme variants). This feature wires them in: a reusable `FlayerLogo`
and the dashboard default logo. Human decision (2026-08-12): use the real brand
assets instead of a hand-built mark. The favicon slot (tab icon personalization)
moved to `dash_enhancement` — this feature is frontend-only.

## R1. Logo in the home header

GIVEN a visitor opens `/`
WHEN the page renders
THEN the header shows the Flayer logotype lockup (`iso_black.svg` in the light
    scheme, `iso_white.svg` in the dark scheme) as an `<img>` rendered as a link
    to `/`, with `alt="Flayer"`

## R2. Operator entry action

GIVEN an operator on `/`
WHEN they click "Acceso del taller" or "Abrir el dashboard"
THEN they are taken to `/dashboard`
AND if they are not authenticated, the existing auth guard redirects to `/login`
AND the page offers no path to `/order-form` — customer intake happens only via
    the shared store link (token) or manual entry from the dashboard

## R3. No selling content

GIVEN the `/` page
WHEN it renders
THEN it contains no selling content — no pricing, no testimonials, no stats, no
    feature claims, no launcher panel
AND the page consists only of: header (logo + "Acceso del taller" link), a short
    headline with one description line, the operator entry action (R2), the
    usage manual section (R7), and the footer line

## R4. Mobile safety

GIVEN the `/` page rendered at any viewport width from 320px up
WHEN the layout reflows
THEN no horizontal scroll occurs
AND every clickable label ("Abrir el dashboard", "Acceso del taller") remains on
    a single line
AND manual entries stay readable (folded accordions, wrap instead of overflow)

## R5. Logo colors and scheme handling

GIVEN the `FlayerLogo` component
WHEN it is rendered
THEN it shows the logotype lockup — `iso_black.svg` in the light scheme and
    `iso_white.svg` in the dark scheme — selecting the variant from the resolved
    color scheme in every context (home header, drawer, AppBar)
AND the orange in all logo assets (`logo.svg`, `iso_black.svg`, `iso_white.svg`)
    is `#FF8400`, equal to the app default primary color
AND the app default primary color is `#FF8400` (currently `EMBER = '#E4572E'` in
    `src/app/theme.ts` and its fallbacks — this feature aligns them)
AND the logo remains legible in both schemes

## R6. Dashboard logo fallback

GIVEN an operator without a custom tenant logo (`logo_url` is null)
WHEN the dashboard renders
THEN the drawer header and the AppBar show the Flayer logotype lockup instead of
    the current plain-text "Flayer" — scheme variant in both contexts
    (`iso_black.svg` light, `iso_white.svg` dark)
AND when a tenant logo URL exists, the uploaded image (the business isotype)
    still takes precedence (existing behavior unchanged)

## R7. Usage manual

GIVEN a visitor who wants to learn how to use the MVP
WHEN they reach the manual section on `/`
THEN it explains, feature by feature, how to use the app — how customers place
    an order (via the shared store link or manual entry), how budgets are
    calculated, running the dashboard, stock and movements, printers
AND the tone is documentation, not selling: imperative instructions, no benefits
    copy, no claims, no price talk
AND each feature entry is collapsible so the page stays compact, and the whole
    section reflows without horizontal scroll from 320px up

## R8. Order form requires a token

GIVEN a visitor opens `/order-form` without a `token` query parameter
WHEN the page renders
THEN the order form is not accessible: the page shows a sign explaining that the
    form is shared privately by the workshop (the maker) through a link with a
    token, and that the visitor must ask the workshop for that link
AND no part of the form renders (no inputs, no product picker, no submit)
AND when the URL does carry a token, the order form renders exactly as today
    (existing behavior unchanged)
AND the API-level enforcement of the token requirement (public intake rejected
    without a valid store token, anonymous intake removed) is guaranteed by
    `create_order` R7 — this requirement covers the frontend gate only

## Out of scope

- Selling / marketing landing content — explicitly out: this page will never sell
- Inviting customers to `/order-form` from `/` — out: intake is only the shared
  token link or manual entry
- Invalid / unknown token UX on the order form — unchanged: the frontend gate
  only checks presence, the API's existing errors apply (R8)
- Token expiration — out: tokens do not expire; regenerating invalidates the
  old link (existing `store_token` behavior)
- Favicon personalization (dedicated `favicon_url` column, `/me/favicon`
  endpoints, Profile card, tab wiring) → `dash_enhancement`
- Tenant logo upload UI (exists in profile; untouched — `logo_url` stays the
  business isotype for the dashboard)
- Public intake token enforcement (API-level: missing/unknown token → 404,
  anonymous intake removed) → `create_order` R7 (2026-08-12 revision)
- Backend changes — none (see design.md for the full-stack rule exception)
- Logo animation, PWA icons → future

## Related

- `authentication` — dashboard auth guard (R2), `logo_url` source (R6)
- `create_order` — `/order-form` + store token (R2, R7, R8)
- `dashboard` — drawer + AppBar Logotype (R6), manual entry (R7)
- `generate_budget`, `stock_management`, `printer_profiles` — manual entries (R7)
- `dash_enhancement` — owns the favicon slot, consumes the `logo.svg` asset