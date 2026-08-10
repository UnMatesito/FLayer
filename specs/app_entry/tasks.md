# Tasks — app_entry

## Frontend

- [ ] Create `src/components/FlayerLogo.tsx`: SVG mark (sliced-print motif, stacked
      offset bars, `var(--color-primary)` + `currentColor` only — no color
      literals), optional wordmark span, `size` prop (R6)
- [ ] Rewrite `src/app/page.tsx`: remove "Cómo funciona" steps, "En el taller"
      panel, and capability rows; keep eyebrow/h1/description, the two CTAs, the
      footer (R2, R3, R4)
- [ ] Header on `/`: replace the text wordmark with `<FlayerLogo withWordmark />`
      linked to `/` (R1)
- [ ] Update `Logotype()` fallback in `src/app/dashboard/layout.tsx`: `logo_url`
      null → `<FlayerLogo size={24} withWordmark />` instead of the plain-text
      span; `logo_url` set → unchanged (R7)
- [ ] Verify: `npx tsc --noEmit` and `npm run build` pass (all R)

## Manual pass

- [ ] At 320 / 375 / 414 / 768 px: no horizontal scroll; "Solicitar un pedido" and
      "Acceso del taller" stay on one line (R5)
- [ ] Logo legible in light and dark schemes on `/` and in the dashboard sidebar
      (R6)
- [ ] With a tenant logo set in the profile, the dashboard still shows the
      uploaded image (R7)
