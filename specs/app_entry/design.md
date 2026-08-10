# Design — app_entry

Frontend-only. **Full-stack rule exception**: `/` is a static public page — no
state, no data, no endpoints. The only app data involved (`logo_url`) is already
served by the authentication profile endpoint. Backend work here would be
ceremony; this is the documented exception per AGENTS.md.

This spec supersedes the ad-hoc Split Diptych build on `/` (2026-08-08, Boneyard
DNA) — that build predates this feature and is replaced by R1–R5.

## Page — `/` (R1–R5)

```
header  [FlayerLogo withWordmark → /]                    [Acceso del taller → /dashboard]
main
  eyebrow (mono, uppercase, ember)  Impresión 3D · bajo pedido
  h1                                Pedidos que se imprimen, no que se pierden.
  p                                 Flayer ordena las solicitudes de tus clientes,
                                    calcula presupuestos por gramo y vatio, y lleva
                                    el stock de filamentos al día.
  CTAs  [Solicitar un pedido → /order-form]  [Abrir el dashboard → /dashboard]
footer  Presupuestos por peso, energía y amortización. · Un taller, un lugar para todo.
```

- **Removed** vs. current build: "Cómo funciona" numbered steps, "En el taller"
  launcher panel, capability rows, panel CTA.
- **Kept**: the copy (honest, non-selling), the two CTAs, the header taller link,
  the footer lines, and all layout tokens — Overpass + Overpass Mono,
  gray-50/gray-900 paper-ink, ember accent, Tailwind scale classes only (no
  arbitrary values), dark-scheme token flip, no horizontal scroll below 320px.
- Header logo becomes a link to `/` (R1). Header keeps only the taller link —
  no other chrome.

## Component — `FlayerLogo` (new) (R6, R7)

- File: `src/components/FlayerLogo.tsx` — alongside the existing `FilamentIcon` /
  `PrinterIcon` convention.
- Props: `{ size?: number; withWordmark?: boolean }` — defaults `24`, `false`.
- **Mark** — hand-built SVG (Tier B), the sliced-print motif: 3–4 stacked
  horizontal bars, offset so the stack reads as layers (a print cross-section),
  rounded ends, drawn in `var(--color-primary)` (ember) on transparent.
- **Colors**: theme tokens only — `var(--color-primary)` for the bars,
  `currentColor` where the component must follow surrounding ink. Zero color
  literals inside the component (R6). Renders identically in light and dark
  schemes (ember is scheme-constant).
- **Wordmark**: when `withWordmark`, renders "Flayer" in Overpass 700,
  `tracking-tight`, inheriting ink, beside the mark.
- Sizing via the `size` prop on the `<svg>`; wordmark uses `text-[1.1rem]`-ish
  scale class to stay proportional (dashboard Logotype currently uses
  `text-[1.1rem] font-bold tracking-[0.01em]` — keep those values token-free
  scale classes, no new arbitrary values).

## Dashboard Logotype fallback (R7)

`src/app/dashboard/layout.tsx`, `Logotype()`:

- `logo_url` set → unchanged: `<img>` of the tenant logo.
- `logo_url` null → replace the plain-text "Flayer" span with
  `<FlayerLogo size={24} withWordmark />` (drawer header context).
- The collapsed-drawer case renders the mark only (no wordmark) if the current
  markup hides text there anyway — implementation detail, behavior per R7.

## Technical decisions

**Chosen: hand-built SVG mark (Tier B).** Discarded: PNG/SVG asset files and an
icon-library glyph. Chosen: a vector component matches the existing
`FilamentIcon`/`PrinterIcon` pattern, scales losslessly, and — critically for R6 —
can consume CSS variables so the same mark works in both color schemes without
duplicate assets.

**Chosen: ember (`var(--color-primary)`) as the mark color.** Discarded: ink-only
mark. Chosen: the accent is the brand's only chromatic constant and is identical
in both schemes, so the mark stays recognizable on gray-50 paper and dark canvas
alike.

**Chosen: remove the Boneyard sections entirely, not restyle them.** Discarded:
keeping the steps/features/panel and de-marketing the copy. Chosen: those
sections are selling-shaped (structure itself is the tell); a local MVP entry
page has no use for them. The spec supersedes the ad-hoc build.

## Verification

- `npx tsc --noEmit` + `npm run build` — all R's compile and routes resolve
- Manual pass at 320 / 375 / 414 / 768 px: no horizontal scroll, single-line
  clickable labels (R5) — same pattern as dashboard manual tasks 65–66
- Source inspection: `FlayerLogo.tsx` contains no color literals (R6)
- Manual pass: logo legible in light and dark schemes on `/` and in the sidebar;
  tenant logo still wins when set (R6, R7)
