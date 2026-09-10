# Tasks — dash_enhancement

## Backend

- [x] Add nullable user favicon storage field next to the existing logo storage
      field and expose `favicon_url` on the authenticated user schema (R2)
- [x] Update the user response builder to generate favicon URLs with backend
      mtime cache-busting, matching the existing logo URL pattern (R2)
- [x] Add favicon storage helper mirroring logo validation and storage behavior
      (R3, R5)
- [x] Add `POST /me/favicon` with replacement semantics, 422 validation errors
      and unchanged previous favicon on invalid upload (R3, R5, R6)
- [x] Add `DELETE /me/favicon` with field clearing, stored-file removal and 401
      unauthenticated behavior (R4, R6)
- [x] Backend tests: favicon upload, replacement, deletion, cache-busted response,
      invalid file unchanged and unauthenticated requests (R2-R6)
- [x] Extend the dashboard low-stock backend/read model to include Productos
      using existing product threshold if available, otherwise `stock_quantity < 1`
      (R10)
- [x] Backend tests: low-stock response includes Productos, Filamentos and
      Insumos with type labels, stock values and thresholds (R10)
- [x] Backend tests: no low-stock rows returns an empty low-stock collection
      without false product alerts (R12)
- [x] Add unified Historial item-options endpoint or equivalent API support for
      Productos, Filamentos and Insumos options (R15)
- [x] Add unified Historial movement feed that accepts mixed `item_keys[]`, keeps
      tenant filtering and returns normalized movement rows with source metadata
      (R16)
- [x] Backend tests: unified movement options include type labels and display
      names for Producto, Filamento and Insumo (R15)
- [x] Backend tests: unified movement feed filters by mixed product/filament/Insumo
      keys and preserves source entity metadata (R16, R17)

## Frontend Foundation

- [x] Add `/logo.svg` to root layout metadata icons as the default favicon (R1)
- [x] Update auth/user API types and client functions for `favicon_url`,
      `uploadFavicon` and `removeFavicon` (R2-R4)
- [x] Update favicon tab wiring to use returned backend cache-busted
      `favicon_url` as-is and reset to `/logo.svg` when null (R1, R2, R4)
- [x] Add Perfil "Favicon" card next to "Logotipo" with preview, upload, remove,
      pending states and independent logo behavior (R7)
- [x] Frontend tests: default favicon reset and custom favicon URL application
      without client `Date.now()` cache busting (R1, R2, R4)
- [x] Frontend tests: Perfil favicon card upload/remove states do not mutate the
      Logotipo UI state (R7)

## Global Feedback And Errors

- [x] Add centralized dashboard feedback provider/hook and mount it in the
      dashboard shell (R8, R9)
- [x] Route dashboard mutation successes through the shared feedback popup for
      create/update/delete/archive/restore/upload/remove/stock-adjust/status-change/save
      operations (R8)
- [x] Route dashboard mutation failures through the shared feedback popup while
      preserving the current table/list context (R9)
- [x] Support closeable dashboard notification entries in the centralized
      feedback pattern so low-stock popups can be dismissed without page-local
      notification state (R8, R11)
- [x] Add shared `normalizeApiError(error, fallback)` utility for strings,
      objects, arrays, FastAPI validation details, network failures and unknown
      thrown values (R9, R21)
- [x] Search frontend error rendering for `err.detail || fallback`, direct object
      rendering and similar patterns; replace with the shared normalizer (R21)
- [x] Fix budget form earnings margin empty/invalid error rendering with a
      specific Spanish message (R22)
- [x] Frontend tests: global feedback success and error popups render Spanish
      messages for representative dashboard mutations (R8, R9)
- [x] Frontend tests: error normalizer never returns `[object Object]` for string,
      array, object, FastAPI validation, network and unknown errors (R21)
- [x] Frontend tests: earnings margin empty/invalid case renders a readable
      Spanish message and no `[object Object]` (R22)

## Stock Bajo

- [x] Add product low-stock API client/types and integrate them with existing
      dashboard low-stock data loading (R10)
- [x] Add dashboard "Stock bajo" popup notification display when low-stock data
      is present, using the centralized feedback/notification pattern where
      appropriate (R11)
- [x] Add close/dismiss behavior for the low-stock popup so dismissal hides only
      that popup instance and does not mutate stock data or persistent low-stock
      visibility (R11)
- [x] Add dashboard/nav/overview persistent "Stock bajo" visibility when
      low-stock data is present, independent of popup dismissal (R11)
- [x] Add low-stock visibility on Productos, Filamentos and Insumos pages without
      hiding normal table/list content (R11)
- [x] Add normal-stock empty state that avoids alarming badges when no low-stock
      items exist (R12)
- [x] Frontend tests: "Stock bajo" popup appears for product low-stock and links
      or identifies the affected item (R10, R11)
- [x] Frontend tests: closing the low-stock popup hides that popup while keeping
      stock data and persistent low-stock surfaces visible (R11)
- [x] Frontend tests: no low-stock data hides alarming badges and shows normal
      stock copy where the low-stock panel is visible (R12)

## Filters And Historial

- [x] Move/add basic filters inside the Pedidos table card and put extra crowded
      criteria behind "Advanced filters" when needed (R13)
- [x] Move/add basic filters inside the Productos table card and put extra
      crowded criteria behind "Advanced filters" when needed (R13)
- [x] Move/add basic filters inside the Filamentos table card and put extra
      crowded criteria behind "Advanced filters" when needed (R13)
- [x] Move/add basic filters inside the Insumos table card and put extra crowded
      criteria behind "Advanced filters" when needed (R13)
- [x] Move/add Historial filters inside the Historial table card, including date
      basics and advanced criteria where useful (R13)
- [x] Ensure every table filter change resets pagination to page 1 and refreshes
      counts, rows and empty states (R14)
- [x] Replace separate Historial filament/supply filters with one unified
      multi-select listing Productos, Filamentos and Insumos (R15)
- [x] Wire Historial unified multi-select selections into the unified movement
      feed and preserve movement type/source labels in rows (R16)
- [x] Add filtered Historial empty state with a reset-filters action (R17)
- [x] Frontend tests: filter changes reset pagination and update counts/empty
      states for representative pages (R14)
- [x] Frontend tests: Historial unified multi-select shows Producto, Filamento and
      Insumo options with type labels (R15)
- [x] Frontend tests: Historial filtered movement results preserve source entity
      metadata and reset empty state works (R16, R17)

## Drawers And Detail Cards

- [x] Replace create/edit centered modal for Productos with a right drawer on
      desktop and full-width/full-screen or bottom-sheet panel on mobile (R23, R24)
- [x] Replace create/edit centered modal for Filamentos with responsive drawer
      behavior (R23, R24)
- [x] Replace create/edit centered modal for Insumos with responsive drawer
      behavior (R23, R24)
- [x] Replace create/edit centered modal for Impresoras with responsive drawer
      behavior (R23, R24)
- [x] Keep destructive confirmations and focused transactional flows as small
      dialogs where appropriate (R25)
- [x] Add tests or component checks for drawer open/close preserving table filters
      and context on at least representative entity pages (R23, R24)
- [x] Redesign product detail cards into a distinctive, fast-scannable layout
      while preserving quick access to stock, price, status and metadata (R26)
- [x] Apply the same creative-but-usable detail-card hierarchy to Filamento and
      Insumo detail pages where practical (R27)
- [x] Add frontend tests or snapshots/assertions for key product detail fields
      remaining present after the card redesign (R26)

## App Router Error States

- [x] Add dashboard-safe `not-found.tsx` behavior and/or route-level not-found
      states with Spanish 404 copy and return navigation (R18)
- [x] Add dashboard route `error.tsx` handling with retry and safe Spanish copy
      for route segment errors (R20)
- [x] Add `global-error.tsx` style handling that avoids raw stack traces and raw
      object rendering (R20)
- [x] Add route/data-fetch handling for 503, server unavailable and offline states
      with retry or return navigation (R19)
- [x] Frontend tests: 404, 503/offline and route error states render readable
      Spanish copy and no raw object/stack text (R18-R20)

## Responsive And Verification

- [ ] Verify shell/nav and overview at 320, 375, 414, 768 and desktop widths;
      fix unintended horizontal overflow (R28, R29)
- [ ] Verify Pedidos, Productos and product detail at 320, 375, 414, 768 and
      desktop widths; document table scroll/card transformation choices (R28, R29)
- [ ] Verify Filamentos and filament detail at 320, 375, 414, 768 and desktop
      widths; document table scroll/card transformation choices (R28, R29)
- [ ] Verify Insumos, Impresoras, Perfil and Historial at 320, 375, 414, 768 and
      desktop widths; document table scroll/card transformation choices (R28, R29)
- [ ] Verify error pages and empty states at 320, 375, 414, 768 and desktop widths
      (R28, R29)
- [x] Run extended Hallmark anti-AI-sloppiness audit for dashboard and subsequent
      dashboard pages and record findings in `progress/impl_dash_enhancement.md`
      (R30)
- [x] Run backend `pytest` and record pass/fail with failing tests if any (all R)
- [x] Run `npx tsc --noEmit` and `npm run build`; record pass/fail with errors if
      any (all R)
- [x] Update implementation traceability in `progress/impl_dash_enhancement.md`
      mapping every R1-R30 to tests/manual verification (all R)
