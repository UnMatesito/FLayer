# Requirements — dash_enhancement

## Context

The dashboard is the operator's daily workspace for Pedidos, Productos,
Filamentos, Insumos, Impresoras, Perfil and Historial. This feature keeps the
custom favicon decision from the original `dash_enhancement` spec and expands
the work into practical dashboard polish: global feedback, low-stock visibility,
inline filters, unified movement history, usable error states, drawer-based CRUD,
responsive behavior and a Hallmark anti-AI-sloppiness verification pass.

Custom favicon remains a dedicated tenant setting: `favicon_url` is separate
from `logo_url`, so `logo_url` stays the dashboard brand/isotype and the favicon
can be the tenant's tab logotype. The default favicon remains Flayer `/logo.svg`.

## Requirements

R1. GIVEN a browser tab pointing at the app
    WHEN the page loads before an authenticated user has a custom favicon
    THEN the tab shows the Flayer isotype `/logo.svg` as the default favicon
    AND the root layout metadata references `/logo.svg` in `icons`

R2. GIVEN the authenticated user payload is returned by the backend
    WHEN the user has a stored favicon file
    THEN the payload includes `favicon_url` as a dedicated field separate from
    `logo_url`
    AND `favicon_url` is generated with backend storage mtime cache-busting
    equivalent to `storage_service.get_file_url(path, cache_bust=True)`

R3. GIVEN an authenticated operator in Perfil
    WHEN they upload a valid favicon file through `POST /me/favicon`
    THEN the backend stores the file path in the user favicon field
    AND replaces any previous favicon file for that user
    AND the next user payload returns the new cache-busted `favicon_url`

R4. GIVEN an authenticated operator in Perfil
    WHEN they remove their favicon through `DELETE /me/favicon`
    THEN the backend clears the user favicon field
    AND removes the stored favicon file when it exists
    AND the next user payload returns `favicon_url` as null so the tab returns
    to `/logo.svg`

R5. GIVEN an upload to `POST /me/favicon`
    WHEN the file type or size violates the same validation contract used by
    `POST /me/logo`
    THEN the endpoint returns 422 with a readable validation error
    AND the previous favicon remains unchanged

R6. GIVEN an unauthenticated request to `POST /me/favicon` or
    `DELETE /me/favicon`
    WHEN the request is processed
    THEN the endpoint returns 401
    AND no favicon file or database field is changed

R7. GIVEN an authenticated operator in Perfil
    WHEN the Perfil page renders
    THEN a "Favicon" card appears next to "Logotipo"
    AND it previews the current favicon or the Flayer placeholder
    AND its upload/remove actions affect only `favicon_url`, never `logo_url`

R8. GIVEN a dashboard create, update, delete, archive, restore, upload, remove,
    stock-adjust, status-change or save operation completes successfully
    WHEN the operation settles in the frontend
    THEN a centralized dashboard feedback popup shows a concise Spanish success
    message
    AND the popup pattern is shared across dashboard pages instead of being
    implemented as isolated page-local snackbars

R9. GIVEN a dashboard create, update, delete, archive, restore, upload, remove,
    stock-adjust, status-change or save operation fails
    WHEN the operation settles in the frontend
    THEN a centralized dashboard feedback popup shows a readable Spanish error
    message from the shared error normalizer
    AND the page preserves the user's current table/list context

R10. GIVEN dashboard low-stock data is requested
     WHEN filaments, Insumos or Productos are below their low-stock threshold
     THEN the backend response includes all three entity types with type labels,
     display names, current stock values and threshold values
     AND Productos use the existing product minimum-stock field if one exists,
     otherwise the MVP threshold is `stock_quantity < 1` without adding a new
     product threshold migration

R11. GIVEN dashboard low-stock data contains at least one low-stock item
     WHEN the dashboard shell or overview renders
     THEN the UI triggers a closeable "Stock bajo" popup notification using the
     centralized dashboard feedback/notification pattern where appropriate
     AND the operator can close or dismiss that popup instance
     AND closing the popup hides only that popup instance without deleting or
     changing stock data
     AND the affected pages for Productos, Filamentos and Insumos expose
     persistent low-stock visibility in pages, cards or navigation without
     hiding the normal table/list content

R12. GIVEN dashboard low-stock data contains no low-stock items
     WHEN the dashboard shell or overview renders
     THEN no alarming "Stock bajo" popup notification or badge is shown
     AND the empty low-stock state communicates that stock is normal

R13. GIVEN an operator visits Pedidos, Productos, Filamentos, Insumos or
     Historial
     WHEN the table card renders
     THEN the most common filters for that page are visible inline inside the
     table card
     AND extra criteria are behind an "Advanced filters" section or button when
     the filter set would overcrowd the card

R14. GIVEN an operator changes any inline or advanced table filter on Pedidos,
     Productos, Filamentos, Insumos or Historial
     WHEN the filtered query runs
     THEN pagination resets to the first page
     AND result counts, empty states and visible rows match the active filters

R15. GIVEN an operator opens the Historial item filter
     WHEN selectable items are loaded
     THEN a single multi-select control lists Productos, Filamentos and Insumos
     together
     AND each option shows its entity type label and display name

R16. GIVEN an operator filters Historial by one or more items from the unified
     multi-select
     WHEN the filtered movement query runs
     THEN the results include matching product, filament and Insumo stock
     movements from a unified backend/API feed
     AND every movement row preserves source entity metadata and type labels

R17. GIVEN the unified Historial movement feed has no matching rows
     WHEN active filters are applied
     THEN the UI shows a filtered empty state that names Historial
     AND the empty state provides a clear reset-filters action

R18. GIVEN a dashboard route, detail page or data fetch cannot find the requested
     resource
     WHEN Next.js App Router handles the state
     THEN the app shows a user-friendly Spanish 404 experience via route-level
     `not-found.tsx` behavior or explicit not-found state
     AND the page offers a safe way back to the dashboard context

R19. GIVEN a dashboard route or data fetch fails because the API is offline,
     unavailable or returns service-unavailable/server-unavailable status
     WHEN the error is rendered
     THEN the app shows a user-friendly Spanish 503/service unavailable message
     AND the copy mentions server unavailable/offline and offers retry or return
     navigation

R20. GIVEN an unhandled dashboard rendering error occurs
     WHEN Next.js App Router error handling catches it
     THEN `error.tsx` or `global-error.tsx` style handling renders a safe Spanish
     fallback
     AND raw error objects or stack traces are not shown to the operator

R21. GIVEN frontend code receives an API error detail that is a string, array,
     object, FastAPI validation detail list, network failure or unknown thrown
     value
     WHEN the shared error normalizer formats it
     THEN the returned message is readable Spanish text
     AND it never renders `[object Object]`

R22. GIVEN the budget form fails validation because the earnings margin field is
     empty or invalid
     WHEN the frontend renders the error
     THEN the operator sees a specific readable Spanish message for the earnings
     margin case
     AND no `[object Object]` text appears

R23. GIVEN an operator starts a create or edit flow for Producto, Filamento,
     Insumo, Impresora or a similar dashboard entity
     WHEN the form opens on desktop
     THEN it appears in a right-side drawer that preserves the table/list context
     AND the centered modal pattern is not used for these CRUD forms

R24. GIVEN an operator starts a create or edit flow for Producto, Filamento,
     Insumo, Impresora or a similar dashboard entity
     WHEN the form opens on mobile
     THEN it appears as a full-width/full-screen or bottom-sheet-style drawer
     AND all form actions remain reachable without horizontal page overflow

R25. GIVEN an operator initiates a destructive action or a focused transactional
     action
     WHEN confirmation is required
     THEN the UI may keep a small confirmation dialog or focused transactional
     dialog
     AND create/edit CRUD forms still use drawers instead of centered modals

R26. GIVEN the Productos detail page renders
     WHEN product information is shown in cards
     THEN the detail cards use a distinctive, fast-scannable layout that improves
     on simple horizontal cards
     AND the most important fields remain quick to locate

R27. GIVEN related dashboard detail pages render, including Filamentos and
     Insumos where practical
     WHEN detail cards are shown
     THEN the cards apply the same principle of creative but usable visual
     hierarchy
     AND they preserve fast lookup of operational information

R28. GIVEN any dashboard page renders at 320px, 375px, 414px, 768px or desktop
     viewport widths
     WHEN the operator uses the page
     THEN the shell/nav, overview, Pedidos, Productos, product detail,
     Filamentos, filament detail, Insumos, Impresoras, Perfil, Historial, error
     pages and empty states remain usable without unintended horizontal overflow

R29. GIVEN a dashboard table, filters panel, drawer or detail card renders on a
     mobile viewport
     WHEN content exceeds the available width
     THEN the UI deliberately uses horizontal table scroll or a card/list
     transformation
     AND filters, drawers and actions remain discoverable and operable

R30. GIVEN dashboard and subsequent dashboard pages are implemented
     WHEN implementation verification is performed
     THEN an extended Hallmark anti-AI-sloppiness audit is completed for visual
     polish, non-generic layout, responsive behavior and avoidance of templated
     AI-looking admin UI
     AND the audit results are recorded in the implementation progress document

## Out of scope

- New product minimum-stock configuration unless an existing product field already
  supports it. The MVP rule is `stock_quantity < 1`.
- PWA icon sets, maskable icons and favicon animation.
- Replacing all destructive confirmation dialogs with drawers.
- New reporting/export functionality outside Stock bajo and Historial visibility.

## Related

- `brand_identity` — owns the Flayer `/logo.svg` default asset.
- `dashboard` — owns the dashboard shell, overview and existing low-stock
  surfaces.
- `stock_management` — owns Filamentos, Insumos and stock movement history.
- `product_management` — owns Productos and product stock movements.
- `generate_budget` — contains the earnings margin form that must stop rendering
  `[object Object]` for validation errors.
