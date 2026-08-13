# Implementation — brand_identity

Working notes for the `brand_identity` feature. Frontend-only (full-stack rule
exception documented in `specs/brand_identity/design.md`).

## Baseline

- Backend: `poetry run pytest tests/ -q` → **203 passed** (unchanged by this feature — no backend files touched).
- Frontend: `npx tsc --noEmit` clean before touching anything.
- Brand assets already in `src/frontend/public/`: `logo.svg` (isotype 648²), `iso_black.svg` / `iso_white.svg` (lockup 2207×545). The orange in all three is `rgb(255,132,0)` = `#FF8400` — R5's asset-color clause already satisfied, no asset edits needed.
- No frontend test framework in this repo (no jest/vitest; `package.json` has no test script). As in prior frontend tasks, the executable verification is `npx tsc --noEmit` + `pnpm build` (tasks.md task 8). RED phase = the failing check before the change (see task log); traceability is R → file + verification.

## Task log

### Task 1 — Default primary → `#FF8400` (R6/R5)

- RED: `grep E4572E` found 4 live occurrences (theme.ts EMBER, globals.css
  fallbacks ×2, profile placeholder) + 1 dead comment. tsc stays green (color
  values are not type-checked) — the check is the grep.
- GREEN:
  - `src/app/theme.ts:59` — `EMBER = '#FF8400'`
  - `src/app/globals.css:15` — `--color-primary` fallback → `#ff8400`
  - `src/app/globals.css:16` — `--color-ember` fallback → `#ff8400`
    (design.md names only line 15; R5 says "and its fallbacks — this feature
    aligns them" — `--color-ember` is the ember/primary fallback token, so it
    falls inside R5. Noted for reviewer.)
  - `src/app/dashboard/profile/page.tsx:506` — picker placeholder → `#FF8400`
- Refactor: none. `page.tsx:3` stale comment dies with the rewrite (task 3).
- Task marked `[x]` in tasks.md.

### Task 2 — `FlayerLogo` component (R6)

- RED: no component file exists → any import fails tsc.
- GREEN: `src/components/FlayerLogo.tsx` (named export, FilamentIcon/PrinterIcon convention):
  - props `{ size?: number }` (default 24 ≈ old `text-[1.1rem]` Logotype)
  - `<img>` of `/iso_black.svg` (light) / `/iso_white.svg` (dark) resolved via `useResolvedColorScheme()` from `src/app/theme.ts` — purely theme-driven, no AppBar rule
  - `height: size`, `width: auto`, `object-fit: contain`, `alt="Flayer"`
- Task marked `[x]`.

### Task 3 — Rewrite `src/app/page.tsx` (R2, R3, R4)

- RED: current page has "Cómo funciona" steps, "En el taller" panel, capability rows, "Solicitar un pedido" CTA — violates R3/R2. tsc green before change.
- GREEN: rewrote to design.md wireframe:
  - header: `<FlayerLogo />` → `/` + "Acceso del taller" → `/dashboard` (only chrome, `whitespace-nowrap` label)
  - main: eyebrow / h1 / description (kept), single CTA "Abrir el dashboard", then the manual (task 5)
  - removed: paso steps, tallerLinks panel, capacidades rows, both "Solicitar un pedido" CTAs, ArrowForwardIcon import
  - footer kept; tokens kept (no arbitrary values, `break-words` h1, responsive max-w, dark-scheme token flip via MUI vars)
- Task marked `[x]`.

### Task 4 — Header logo on `/` (R1)

- Implemented inside the task-3 rewrite (header `<Link href="/">` wrapping `<FlayerLogo />`, `alt="Flayer"` from the component). Scheme variant per resolved color scheme.
- Task marked `[x]`.

### Task 5 — Usage manual on `/` (R7)

- GREEN: native `<details>`/`<summary>` accordions in the replaced "Cómo funciona" slot, 5 entries (solicitar un pedido — token link + manual entry, presupuesto, panel del taller, stock, impresoras), 2–4 imperative steps each, numbered with mono accent, chevron via CSS (`group-open:rotate-180`), folded = compact list, unfolds in place. No `/order-form` deep links anywhere (R2/R7). Documentation tone, no benefits copy.
- Task marked `[x]`.

### Task 6 — Order form token gate (R8)

- RED: `src/components/OrderForm.tsx` renders the full form with no token (violates R8). 
- GREEN: after all hooks, `if (!token)` → early return of the token-required sign (FlayerLogo mark + mono eyebrow "Enlace privado" + heading + one line: form is shared privately by the workshop through a token link; ask the workshop for the link). No inputs, no picker, no submit, no workaround path. Token present → form unchanged. Empty `?token=` → `'' || undefined` → treated as absent (existing line 16) — sign shows.
- Refactor: none (hooks order untouched). Verified: `InternalOrderForm` (manual entry) posts to authed `/api/orders` and lives on `/dashboard/orders` — unaffected; dashboard `StoreLink` always carries a token.
- Task marked `[x]`.

### Task 7 — Dashboard `Logotype()` fallback (R6)

- RED: fallback branch renders plain "Flayer" text; tsc green before change.
- GREEN: `src/app/dashboard/layout.tsx` — `Logotype({ url })` fallback (url null) now returns `<FlayerLogo />` in both the drawer header and the AppBar (same component, scheme variant per R5 — no special AppBar rule). `logo_url` set → existing `<img>` branch unchanged in both contexts.
- Task marked `[x]`.

### Task 8 — Verify tsc + build (all R)

- See Verification below.

## Files modified

- `src/frontend/src/components/FlayerLogo.tsx` (NEW)
- `src/frontend/src/app/page.tsx` (rewritten)
- `src/frontend/src/components/OrderForm.tsx` (token gate)
- `src/frontend/src/app/dashboard/layout.tsx` (Logotype fallback)
- `src/frontend/src/app/theme.ts` (EMBER → `#FF8400`)
- `src/frontend/src/app/globals.css` (fallbacks → `#ff8400`)
- `src/frontend/src/app/dashboard/profile/page.tsx` (picker placeholder)
- `src/frontend/public/logo.svg`, `iso_black.svg`, `iso_white.svg` (present in repo, already brand-correct — untracked assets, added to version control by this feature? They were added by the human; verified content only)

## Traceability R<n> → test

Frontend-only feature — no backend tests; per prior frontend work the mapping is R → file + `tsc --noEmit` + `pnpm build` (all compile and routes resolve) + manual checklist:

- R1 ← `FlayerLogo.tsx` + `page.tsx` header (`<Link href="/">` + lockup `<img>`, alt="Flayer")
- R2 ← `page.tsx` (only paths out: "Acceso del taller" / "Abrir el dashboard" → `/dashboard`; no `/order-form` from `/`; auth guard untouched — existing)
- R3 ← `page.tsx` (selling/launcher content removed; page = header + headline + description + CTA + manual + footer)
- R4 ← `page.tsx` layout (viewport-safe: no arbitrary widths, `whitespace-nowrap` labels, `break-words`, accordions fold) — viewport pass is manual
- R5 ← `theme.ts`/`globals.css` EMBER + fallbacks = `#FF8400` = rgb(255,132,0) verified in all three SVG assets; `FlayerLogo.tsx` scheme-driven variant
- R6 ← `FlayerLogo.tsx` + `dashboard/layout.tsx` `Logotype()` fallback in drawer + AppBar (scheme variant; `logo_url` set → unchanged)
- R7 ← `page.tsx` manual section (5 `<details>`/`<summary>` entries, imperative tone, no selling, no `/order-form` deep links)
- R8 ← `OrderForm.tsx` token gate (absent/empty token → sign only; token → form unchanged)

## Verification

- Backend: `poetry run pytest tests/ -q` → **203 passed** (unchanged baseline — no backend code touched, documented full-stack exception).
- Coverage: `poetry run pytest tests/ --cov=backend --cov-report=term-missing` → **TOTAL 88%** (2434 stmts, 290 missed) — unchanged from baseline; this feature adds no backend code. 203 passed.
- Frontend: `npx tsc --noEmit` → clean; `pnpm build` → clean — 16 routes (`/`, `/dashboard`, `/dashboard/orders`, `/order-form`, ...) all compile and resolve.
- No `/order-form` reference remains on `/` (grep clean); "Solicitar un pedido" occurs only as the manual's first entry title.
- `./init.sh`-style checks: `brand_identity` stays `in_progress` in feature_list.json (only the human/reviewer advances it).

## Manual verification (human pass — pending)

- [ ] At 320 / 375 / 414 / 768 px: no horizontal scroll; "Abrir el dashboard" and "Acceso del taller" stay on one line; manual accordions fold/unfold without layout shift (R4, R7)
- [ ] Manual reads as documentation, not selling; every entry explains its feature in plain steps; the order entry points to the shared link / manual entry, never to `/order-form` (R7)
- [ ] `/order-form` without token shows only the token-required sign; with token the form renders as before (R8)
- [ ] Store link from the dashboard still opens the form and places an order (R8)
- [ ] Logo legible in light and dark schemes on `/`, in the drawer and on the AppBar; scheme toggle switches the lockup variant in all three contexts (R6)
- [ ] With a tenant logo set in the profile, the dashboard still shows the uploaded image (R7)

## Deviations / notes (for the reviewer)

- `--color-ember` fallback in `globals.css` also aligned to `#ff8400` (design.md lists only the `--color-primary` fallback); R5's "and its fallbacks" covers it — it is the same brand-ember token.
- `FlayerLogo` uses a named export to match the `FilamentIcon`/`PrinterIcon` convention (design says "alongside the existing FilamentIcon / PrinterIcon convention").
- Manual-pass checkboxes in tasks.md intentionally left unchecked — they require a human/hardware pass (see impl_dashboard precedent).
- `page.tsx:3` Hallmark header comment was dropped with the rewrite (it documented the old Split Diptych build this spec supersedes).
## Post-review human add-on (2026-08-12)

- Human request: in the `/` hero, "an orange line with the nozzle like it's printing (like the logo)".
- Added `src/components/PrintLine.tsx` (NEW): decorative hero motif — ink extruder body + tapered tip with an orange filament bead (Var(--color-primary), always brand-orange like the logo's line) + a full-width filament ribbon with a gentle S-wave that draws itself left→right on load (`print-line-draw` keyframes in `globals.css`, `prefers-reduced-motion` respected). Ink parts bind to `--color-ink` (text-primary) so the nozzle flips with the light/dark scheme like `iso_black`/`iso_white`.
- Wired into `src/app/page.tsx` hero between the eyebrow and the h1 (brand moment: the page "starts printing" the headline). Decorative → `aria-hidden`.
- Verified: `tsc --noEmit` clean, `pnpm build` clean (16 routes); geometry rendered locally to PNG and checked pixel-by-pixel (nozzle left, bead tucks under the line start, line spans full width).

## Post-review human add-on #4 (2026-08-12)

- Human: "2 nozzle lines — eliminate the most inside one, make the outer one thicker". The double line was the ribbon's inner S-curve subpath (the second `M...Z` in p0) being stroked alongside the outer silhouette.
- `HeroPrint.tsx`: `nozzlePath` trimmed to the outer subpath only (single closed loop); `strokeWidth` 15 → 24 (thicker, chunky outline). Verified: new path has 1 subpath; render emulation shows a single clean outline (head rising y 246-445, filament tapering down into the line end); tsc + build clean.

## Post-review human add-on #3 (2026-08-12)

- Human refined the hero motif: nozzle is now a pure **outline** (stroke-only, no fill), the print line is **wider** (`h-3.5`/14px), starts at the **left edge and ends at 3/4** of the hero width (`w-3/4`), and the nozzle sits **at the line's end** — simulating the nozzle finishing a printed layer.
- `HeroPrint.tsx`: ribbon path now `fill="none" stroke="#ff8400" strokeWidth="15"` with round joins/caps (the iso silhouette as line-art, including the inner S-curve); positioned `bottom-0 left-[calc(75%-2.5rem)]` so the filament tail (local x≈66.7) lands exactly on the line's right end; responsive `w-24 sm:w-40 lg:w-[180px]`. Line: `left-0 w-3/4 h-3.5 rounded-full` (still draws itself left→right on load).
- Verified by render emulation (976×460 hero): line x[0,732] y[446,460]; outline nozzle x[768,955] y[249,445] — head rises ~200px above the line, tail merging at the line end. tsc + build clean.

## Post-review human add-on #2 (2026-08-12)

- Human clarified the hero motif: a **straight line at the bottom of the hero** + **the iso's nozzle, big, covering the right section** (like the `iso_black`/`iso_white` lockups, whose "flayer" is set with the orange nozzle-ribbon at top-right and a straight line along the full bottom edge).
- Rewrote `PrintLine.tsx` → `HeroPrint.tsx` (NEW, replaces the removed component): the lockup's exact nozzle ribbon path (p0 of `iso_black.svg`, one `#ff8400` path inlined, viewBox 66 3 299 320) anchored `right-0 bottom-0` at `h-[88%]` (head starts at the hero top; tail tip floats just above the bottom line — exactly the lockup's composition); `max-lg:hidden` (no right "section" below lg). Plus the straight bottom line: full-width `h-2 rounded-full` in `var(--color-primary)` with the `print-line-draw` self-drawing animation ("prints" left→right); ribbon gets a gentle `nozzle-fade` (globals.css keyframes; `prefers-reduced-motion` respected).
- `page.tsx`: hero section is now `relative` with the copy wrapped in a `relative` div (paints above the absolute graphic); hero closes before the manual section (the orange line is the hero's bottom edge and replaces the old `border-t` divider; manual section became a sibling `pb-8 pt-6`).
- Verified empirically: composed the exact page geometry (1024×470 hero, ribbon h 88% right-anchored, line h 8px, fake text column) into a test SVG and measured pixels — ribbon bbox x[724,1023] y[50,454] (head top ≈ hero top, tail ends −8px above the line), line at y[460,470] full width, text column x 24-460 with no overlap. `tsc --noEmit` + `pnpm build` clean.
