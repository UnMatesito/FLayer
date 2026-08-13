# Review: brand_identity

Reviewed 2026-08-12. Reviewer ran all verification itself — nothing taken
on trust from the implementer's report.

## Traceability (R → verification, all code-verified by reviewer)

| R | Requirement | Verification | Result |
|---|---|---|---|
| R1 | Logo in home header | `page.tsx:53-55` — `<Link href="/">` wrapping `<FlayerLogo/>`; component renders lockup `<img>` with `alt="Flayer"`, scheme variant | PASS |
| R2 | Operator entry action | `page.tsx` — only two out-links, both → `/dashboard` ("Acceso del taller", "Abrir el dashboard"); no `/order-form` reference on `/` (grep clean); auth guard untouched (existing `ProtectedRoute`) | PASS |
| R3 | No selling content | `page.tsx` — header + headline/description + CTA + manual + footer only; launcher panel, capability rows, "Cómo funciona" steps, customer CTA all gone (matches design wireframe) | PASS |
| R4 | Mobile safety | Frontend-only layout — not backend-testable; explicitly labeled manual (impl §Manual verification, tasks.md Manual pass). Code plausible: no arbitrary widths on `/`, `whitespace-nowrap` labels, `break-words` h1 | PASS (manual, labeled) |
| R5 | Colors + scheme handling | `theme.ts:59` EMBER=`#FF8400`; `globals.css:15-16` both fallbacks → `#ff8400` (incl. `--color-ember` — documented deviation, falls inside R5's "and its fallbacks"); `profile/page.tsx:506` placeholder `#FF8400`; reviewer confirmed `rgb(255,132,0)` = `#FF8400` in all three SVG assets; `FlayerLogo` variant purely theme-driven | PASS |
| R6 | Dashboard logo fallback | `dashboard/layout.tsx` `Logotype()` — `logo_url` null → `<FlayerLogo/>` in drawer (`:174`) AND AppBar (`:298`); `logo_url` set → `<img>` branch unchanged (`:82-84`) in both | PASS |
| R7 | Usage manual | `page.tsx` — 5 `<details>`/`<summary>` entries (pedido via token link/manual entry, presupuesto, panel, stock+movements, impresoras), imperative tone, no deep links to `/order-form`, collapsible | PASS |
| R8 | Order form token gate | `OrderForm.tsx:117-136` — token absent/empty (`'' || undefined`) → sign only, no inputs/picker/submit; token present → form untouched. StoreLink/InternalOrderForm untouched (both on `/dashboard/orders`, StoreLink URL built by existing backend API) | PASS |

## Tasks

8/8 `[x]` in tasks.md Frontend section. The 6 Manual-pass checkboxes are
unchecked by design — they require a human/hardware pass; impl_dashboard
precedent (reviewer approved 08-04, human pass 08-10). Documented in impl.

## Tests run (reviewer, not implementer)

- `poetry run pytest tests/ -q` (src/) → **203 passed**
- `poetry run pytest tests/ --cov=backend --cov-report=term-missing` →
  **TOTAL 88%** (2434 stmts, 290 missed), 203 passed
- `npx tsc --noEmit` (frontend) → **clean, exit 0**
- `pnpm build` (frontend) → **clean, 16 routes** (`/`, `/dashboard/*`, `/order-form`, …)
- Grep: no `E4572E`/`e4572e` remains in frontend source (only stale `.next/dev` cache, auto-regenerated); no `/order-form` on `/`

## Coverage

No backend files touched (`git diff` confirms: 7 frontend files only). Coverage
requirement of touched files N/A for backend — full-stack exception documented
in `specs/brand_identity/design.md` §Frontend-only ("`/` is a static public
page — no state, no data, no endpoints"; API token enforcement tracked in
`create_order` R7). Frontend has no test framework in this repo (no test
script in `package.json`) — verification = tsc/build + labeled manual pass,
per impl_dashboard precedent. Accepted.

## Verdict: APPROVED

## Recommended changes (non-blocking)

1. **Commit the brand assets with the feature.** `src/frontend/public/logo.svg`,
   `iso_black.svg`, `iso_white.svg` are untracked in git (not gitignored). The
   build does NOT validate their presence — if a commit forgets them, R1/R5/R6/R7
   silently degrade to broken images at runtime. Stage them explicitly in the
   feature commit.
2. **Spec-label nits (cosmetic, no implementation impact):** `tasks.md:25` labels
   the Logotype fallback task "(R7)" but it implements R6 (R7 = usage manual);
   `tasks.md:5` and `design.md` §Default primary color label the EMBER/primary
   alignment "(R6)" while `requirements.md` R5 owns it ("the app default primary
   color is #FF8400 … this feature aligns them"). Align the labels if the specs
   are edited again.