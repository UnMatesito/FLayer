# Tasks — brand_identity

## Frontend

- [x] Align default primary to `#FF8400`: `EMBER` in `src/app/theme.ts`, the
      `--color-primary` fallback in `src/app/globals.css`, and the color picker
      placeholder in `src/app/dashboard/profile/page.tsx` (R6)
- [x] Create `src/components/FlayerLogo.tsx`: `<img>` of the logotype lockup,
      props `{ size?: number }` — scheme variant (`iso_black` / `iso_white` via
      `useResolvedColorScheme`), `height: size`, `width: auto`, `alt="Flayer"`
      (R6)
- [x] Rewrite `src/app/page.tsx`: remove "Cómo funciona" steps, "En el taller"
      panel, capability rows, and the customer CTA; keep eyebrow/h1/description,
      the "Abrir el dashboard" CTA, the footer (R2, R3, R4)
- [x] Header on `/`: replace the text wordmark with `<FlayerLogo />` linked to
      `/` (R1)
- [x] Usage manual on `/`: `<details>`/`<summary>` accordions below the CTA —
      one entry per feature (solicitar un pedido — via the shared store link or
      manual entry, presupuesto, panel del taller, stock, impresoras),
      imperative documentation tone, no `/order-form` deep links (R7)
- [x] Order form gate in `src/components/OrderForm.tsx`: token absent → render
      the token-required sign (not the form); token present → unchanged (R8)
- [x] Update `Logotype()` fallback in `src/app/dashboard/layout.tsx`: `logo_url`
      null → `<FlayerLogo />` in both the drawer header and the AppBar;
      `logo_url` set → unchanged in both (R7)
- [x] Verify: `npx tsc --noEmit` and `npm run build` pass (all R)

## Manual pass

- [ ] At 320 / 375 / 414 / 768 px: no horizontal scroll; "Abrir el dashboard" and
      "Acceso del taller" stay on one line; manual accordions fold/unfold without
      layout shift (R4, R7)
- [ ] Manual reads as documentation, not selling; every entry explains its
      feature in plain steps; the order entry points to the shared link / manual
      entry, never to `/order-form` (R7)
- [ ] `/order-form` without token shows only the token-required sign; with token
      the form renders as before (R8)
- [ ] Store link from the dashboard still opens the form and places an order (R8)
- [ ] Logo legible in light and dark schemes on `/`, in the drawer and on the
      AppBar; scheme toggle switches the lockup variant in all three contexts
      (R6)
- [ ] With a tenant logo set in the profile, the dashboard still shows the
      uploaded image (R7)