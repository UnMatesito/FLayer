# Design — brand_identity

Frontend-only. **Full-stack rule exception**: `/` is a static public page — no
state, no data, no endpoints. The only app data involved (`logo_url`) is already
served by the authentication profile endpoint. Backend work here would be
ceremony; this is the documented exception per AGENTS.md. The API-level
enforcement of the token requirement lives in `create_order` (R7, hardening
revision 2026-08-12) — this feature only gates the UI. The favicon slot (tab
icon personalization) lives in `dash_enhancement`, which depends on this
feature's `logo.svg` asset.

This spec supersedes the ad-hoc Split Diptych build on `/` (2026-08-08, Boneyard
DNA) — that build predates this feature and is replaced by R1–R4.

Human decision (2026-08-12): use the real brand assets instead of a hand-built
mark. The spec's original hand-built-SVG decision is discarded.

## Brand assets (human-provided, in `src/frontend/public/`)

| Asset | What it is | Used for |
|---|---|---|
| `logo.svg` | Isotype, square 648×648: white cube body, ember F + underline | Default favicon for the tab — wired by `dash_enhancement` |
| `iso_black.svg` | Logotype lockup 2207×545: cube mark + "Flayer" wordmark, black wordmark, ember underline | `/` header + dashboard drawer header in the **light** scheme (R1, R6, R7) |
| `iso_white.svg` | Same lockup, white wordmark | `/` header + dashboard drawer header + AppBar in the **dark** scheme (R5, R6, R7) |

- The orange in all three assets is `rgb(255,132,0)` = `#FF8400`, which is the
  brand default primary color (R6).
- Assets are served from `/public`, referenced as `/logo.svg`, `/iso_black.svg`,
  `/iso_white.svg`.
- The lockup is wide (≈4:1), so sizing is by height with `width: auto`.

## Page — `/` (R1–R4)

```
header  [FlayerLogo (logotype lockup) → /]                [Acceso del taller → /dashboard]
main
  eyebrow (mono, uppercase, ember)  Impresión 3D · bajo pedido
  h1                                Pedidos que se imprimen, no que se pierden.
  p                                 Flayer ordena las solicitudes de tus clientes,
                                    calcula presupuestos por gramo y vatio, y lleva
                                    el stock de filamentos al día.
  CTA    [Abrir el dashboard → /dashboard]
  manual (R7)                       accordion guide: pedido → presupuesto → taller →
                                    stock → impresoras, plain instructions
footer  Presupuestos por peso, energía y amortización. · Un taller, un lugar para todo.
```

- **Removed** vs. current build: "Cómo funciona" numbered steps, "En el taller"
  launcher panel, capability rows, the "Solicitar un pedido" panel CTA, and the
  customer CTA — customer intake is only the shared store link (token) or
  manual entry, never a public invite from `/` (R2). The manual (R7) replaces
  the old steps section with documentation: same surface, different intent.
- **Kept**: the copy (honest, non-selling), the sole dashboard CTA, the header
  taller link, the footer lines, and all layout tokens — Overpass +
  Overpass Mono, gray-50/gray-900 paper-ink, ember accent, Tailwind scale
  classes only (no arbitrary values), dark-scheme token flip, no horizontal
  scroll below 320px.
- Header logo becomes a logotype lockup linked to `/`, `alt="Flayer"` (R1).
  Variant: `iso_black.svg` light / `iso_white.svg` dark, per resolved scheme.
  Header keeps only the taller link — no other chrome.

## Usage manual (R7)

Below the CTA, before the footer — the old "Cómo funciona" slot reframed as a
manual for people who want to USE the MVP:

- Native `<details>` / `<summary>` accordions (no new dependency; the page is
  already a client component). Summary labels: feature name; body: 2–4
  imperative steps in plain Spanish.
- Entries cover the MVP surface — one per feature:
  - **Solicitar un pedido** — how customers order: the operator shares the
    store link (token, from the dashboard), customers open it on the order
    form; the operator can also enter the order manually from the dashboard.
    No deep link to the form — intake lives with the token, not the `/` page.
  - **Presupuesto** — how grams, watts and amortization are calculated
    (per-currency parameters)
  - **El panel del taller** — dashboard navigation, orders, products, printers
  - **Stock** — filaments, supplies, movements, low-stock chips
- Tone rules (R7): imperative instructions, no benefits copy, no claims, no
  price talk. If a step lives behind login, it says so ("dentro del panel,
  tras iniciar sesión") instead of selling it.
- Visual: `<summary>` rows styled with existing tokens (ink text, line
  borders, primary hover), Chevron via CSS; folded state = compact list of
  feature names (keeps the entry page minimal); unfolds in place, no layout
  shift of the CTA above.
- Mobile (R4): folded list is flat at 320px; body text wraps; no horizontal
  scroll.

## Component — `FlayerLogo` (new) (R6, R7)

- File: `src/components/FlayerLogo.tsx` — alongside the existing `FilamentIcon` /
  `PrinterIcon` convention.
- Renders an `<img>` of the lockup, not an inline SVG: the brand lockup is an
  authored asset with a baked wordmark — redrawing it as paths duplicates the
  brand file and drifts with the next design pass.
- Props: `{ size?: number }` — `size` is the rendered height (default 24, ≈ the
  current `text-[1.1rem]` Logotype).
- **Variant selection** — purely theme-driven (human decision 2026-08-12: the
  logo switches black/white with the color scheme in every context):
  `/iso_black.svg` in the light scheme, `/iso_white.svg` in the dark scheme,
  resolved via the existing `useResolvedColorScheme()` from `src/app/theme.ts`
  (already used by `dashboard/layout.tsx`).
  - Known tradeoff, accepted: on the AppBar (maker/primary-orange bar in both
    schemes) the black wordmark in light mode sits on orange — lower contrast
    than the previous always-white rule. Explicitly chosen by the human over
    the hardened-mode look.
- Sizing: `height: size` px, `width: auto`, `object-fit: contain`.
- `alt="Flayer"`.

## Dashboard Logotype fallback (R7)

`src/app/dashboard/layout.tsx`, `Logotype()` — used in two contexts:

- Drawer header (`DrawerContent`, rail background): `logo_url` null →
  `<FlayerLogo />` (scheme variant).
- AppBar (maker/primary background, `appBarStyle`): `logo_url` null →
  `<FlayerLogo />` (scheme variant, per R5 — no special AppBar rule).
- `logo_url` set → unchanged in both contexts: `<img>` of the tenant logo.

## Order form token gate (R8)

`/order-form` is only reachable via the shared store link (token) — no token,
no form:

- Implemented inside `src/components/OrderForm.tsx` (it already reads
  `searchParams.get('token')`, line 16): when the token is absent, render the
  notice instead of the form — no inputs, no product picker, no submit (R8).
- The notice is a plain sign in the existing page chrome — a short heading and
  one or two lines in the documentation tone: the form is shared privately by
  the workshop through a linked token; ask the workshop for the link. It can
  reuse the `FlayerLogo` mark above the heading for coherence, but it sells
  nothing and offers no workaround path (no mailto, no backdoor to the form).
- Styling: existing tokens only — ink text, line borders, mono eyebrow accent,
  `max-w` container like the current page wrapper. Same responsive behavior as
  the rest of the app (no horizontal scroll at 320px).
- Token present → the current form renders untouched; invalid-token behavior
  stays as-is today (API errors surface where they already do).
- **Verified dependencies (2026-08-12)**: the only no-token linkages to
  `/order-form` today are the `/` page CTAs (removed by R2). The dashboard
  StoreLink always carries a token (`store_token.py:44`); `InternalOrderForm`
  (manual entry) lives on `/dashboard/orders` and posts to the authed
  `/api/orders` — unaffected. Empty `?token=` → `'' || undefined`
  (`OrderForm.tsx:16`) → treated as absent → sign shows. The backend's
  token-less anonymous mode stays open until `create_order` R7 lands
  (hardening revision 2026-08-12) — tracked there, not here.

## Default primary color (R6)

The brand primary is `#FF8400`; the code currently lags at `#E4572E` (EMBER).
Aligning it is part of this feature:

- `src/app/theme.ts:59` — `export const EMBER = '#FF8400'`
- `src/app/globals.css:15` — `--color-primary` fallback `#e4572e` → `#ff8400`
- `src/app/dashboard/profile/page.tsx:506` — color picker placeholder
  `#E4572E` → `#FF8400`

This recolors app-wide accents (buttons, selection states) to the brand orange —
deliberate, it IS the default primary. Tenant accents (`accent` in profile) are
unaffected.

## Technical decisions

**Chosen: real brand assets over a hand-built SVG mark.** Discarded: the spec's
original Tier B hand-built mark. Chosen: the human delivered an authored isotype
and a two-variant logotype lockup; the mark claim of the original decision (CSS
vars for scheme safety) is now served by the variant pair (`iso_black` /
`iso_white`), switch by theme. No duplicates, one brand source of truth, and the
wordmark stays pixel-identical to the design file.

**Chosen: scheme-driven variant in every context — the logo switches black/white
with the light/dark theme (R5, R6).** Human decision 2026-08-12. Replaces the
earlier rule of always-`iso_white` on the AppBar; the maker bar stays
primary-orange in both schemes, so in light mode the black wordmark sits on
orange with lower contrast — accepted tradeoff (the design file ships no other
pair; the white wordmark on the dark-mode bar preserves the brand-consistent
look).

## Verification

- `npx tsc --noEmit` + `npm run build` — all R's compile and routes resolve
- Manual pass at 320 / 375 / 414 / 768 px: no horizontal scroll, single-line
  clickable labels (R4), manual accordions fold/unfold without layout shift
  (R4, R7)
- Manual pass: manual reads as documentation, not selling (R7)
- Manual pass: `/order-form` without token shows the token-required sign, no
  form elements; with a valid token the form renders as before (R8)
- Manual pass: store link from the dashboard still opens the form and places an
  order (R8)
- Manual pass: logotype legible in light and dark schemes on `/`, in the
  drawer and on the AppBar; scheme toggle switches the lockup variant in all
  three contexts (R6, R7)
- Manual pass: with a tenant logo set in the profile, the dashboard still shows
  the uploaded image (R7)