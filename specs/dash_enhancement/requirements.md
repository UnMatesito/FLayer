# Requirements — dash_enhancement

## Context

The dashboard and Profile settings are the operator's space; the browser tab is
the one surface still showing stock Next defaults (no favicon configured). The
tenant can already publish a business isotype (`logo_url`) for the dashboard —
the tab icon deserves the same personalization, as its own slot: the business
logo is the isotype (brand mark in the dashboard), while the favicon is where
tenants place their logotype. Human decision (2026-08-12): the favicon must be a
dedicated `favicon_url`, never a reuse of `logo_url`. The Flayer brand default
(`logo.svg`) and the logotype lockups come from `brand_identity`; this feature
wires them into the tab and adds the tenant-managed favicon.

Moved here from `brand_identity` (2026-08-12) so `brand_identity` stays
frontend-only.

## R1. Default tab icon

GIVEN a browser tab pointing at the app
WHEN the page loads
THEN the tab shows the Flayer isotype `logo.svg` as the default favicon,
    referenced from the root layout metadata `icons`

## R2. Dedicated favicon slot

GIVEN the user payload
WHEN the backend returns the authenticated user
THEN it includes a dedicated `favicon_url`, separate from the business isotype
    `logo_url`
AND the tab icon follows `favicon_url`: uploads, replacements and removals from
    the Profile settings take effect on the tab
AND the favicon URL is cache-busted so a replaced favicon actually updates the
    tab icon

## R3. Favicon API

GIVEN an authenticated operator in the Profile settings
WHEN they upload a favicon
THEN the backend persists it in a dedicated column (surfaced as `favicon_url` in
    the user payload) via `POST /me/favicon`, mirroring the existing
    logo endpoints
AND `DELETE /me/favicon` clears it and removes the stored file
AND both endpoints validate and reject unsupported files/beyond-size files with
    422, and reject unauthenticated requests with 401 (same contract as
    `POST/DELETE /me/logo`)

## R4. Favicon management in Profile settings

GIVEN an authenticated operator in the Profile settings
WHEN the settings render
THEN a "Favicon" card sits next to the existing "Logotipo" card, showing the
    current favicon or the Flayer-isotype placeholder
AND upload / remove actions are available (pending states, validation errors),
    operating only on the favicon — the business logo (`logo_url`) is untouched
    by favicon operations

## Out of scope

- Flayer brand assets (`logo.svg`, `iso_black.svg`, `iso_white.svg`) — added and
  wired into `/` and the dashboard by `brand_identity`
- Tenant logo upload UI (exists in profile; untouched — `logo_url` stays the
  business isotype for the dashboard)
- Logo animation, PWA icons → future

## Related

- `brand_identity` — `logo.svg` isotype asset (R1), depends on it for the
  default
- `dashboard` — Profile settings page (R4), `/me/logo` pattern (R3),
  `logo_url` isotype (R2)
- `authentication` — user payload, `get_verified_user` (R2, R3)