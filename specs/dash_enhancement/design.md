# Design — dash_enhancement

Full-stack feature: backend user favicon storage, low-stock/product movement API
enhancements, shared error formatting, and dashboard frontend polish. The feature
touches the existing dashboard after `dashboard`, `brand_identity`,
`stock_management`, `product_management`, `printer_profiles` and
`generate_budget` have established the core screens.

## Data Model Notes

Reference `docs/data_model.md` for canonical ownership.

| Area | Tables/models touched | Change |
|---|---|---|
| Favicon | `users` | Add nullable favicon storage field next to the existing logo storage field. Surface as `favicon_url` in the authenticated user response. |
| Stock bajo | `filaments`, `supplies`, `fixed_products` | Read existing stock fields. Filamentos/Insumos keep existing low-stock rules from dashboard/stock code. Productos use an existing product min threshold only if present; otherwise no migration and MVP rule is `stock_quantity < 1`. |
| Historial | `stock_movements`, product movement source owned by `product_management` | Do not merge tables. Add a read-model/API aggregator that normalizes filament, Insumo and product movements into one response shape. |
| CRUD drawers | Existing entity tables | No schema change. This is a frontend interaction change. |
| Error normalization | None | Shared frontend utility only unless an endpoint currently returns non-standard error shapes that should be normalized server-side. |

Avoid a product minimum-stock migration for this feature unless implementation
finds an already-planned/product-owned field available. The requirement is
visibility, not new inventory policy configuration.

## Backend Design

### Favicon (R1-R7)

Mirror the existing logo machinery while keeping favicon separate from logo.

Affected backend files:

- `src/backend/models/user.py`: add a nullable favicon storage path field next to
  `logo_path`.
- `src/backend/schemas/auth.py`: add `favicon_url: str | None` to the user
  response schema.
- `src/backend/api/auth.py`: include favicon in `_user_response`; add upload and
  delete endpoints.
- `src/backend/services/storage_service.py`: add `save_favicon(file, user_id)`
  and use existing validation behavior from logo upload.

Endpoints:

| Method | Route | Request | Response |
|---|---|---|---|
| `POST` | `/me/favicon` | Authenticated multipart file; same accepted types and max size as `/me/logo` | Updated user payload with `favicon_url`; 422 for invalid file; 401 unauthenticated |
| `DELETE` | `/me/favicon` | Authenticated request | Updated user payload with `favicon_url: null`; 401 unauthenticated |

Cache busting:

- Generate `favicon_url` with backend mtime versioning via the same storage
  pattern used for logo URLs: `storage_service.get_file_url(path,
  cache_bust=True)` or an equivalent helper if the exact signature differs.
- The frontend should set the tab link to the returned URL as-is. It should not
  append `Date.now()` when a cache-busted backend URL is available.
- When `favicon_url` is null, the frontend resets the icon to `/logo.svg`.

Favicon flow:

```text
Perfil upload
  -> POST /me/favicon
  -> validate and store file
  -> delete previous favicon file if replaced
  -> persist favicon path on users
  -> return user payload with cache-busted favicon_url
  -> auth context updates <link rel="icon">
```

### Global Feedback (R8, R9)

No backend endpoint is required solely for popups. Backend endpoints should keep
returning structured errors with `detail` when possible. Frontend consumes all
mutation outcomes through one dashboard feedback pattern.

Operations covered by the shared feedback pattern:

- Create/update/delete/archive/restore for dashboard entities.
- Upload/remove for logo, favicon, product images or similar files.
- Stock-adjust and status-change mutations.
- Save operations such as Perfil/budget parameter settings.

### Stock Bajo (R10-R12)

Current dashboard low-stock support covers Filamentos and Insumos. Extend the
read model to include Productos.

Recommended endpoint shape:

| Method | Route | Request | Response |
|---|---|---|---|
| `GET` | `/api/dashboard/low-stock` or existing dashboard summary route | Authenticated query; no request body | `{ items: LowStockItem[] }` or existing summary plus product entries |

Normalized item shape:

```ts
type LowStockItem = {
  id: string;
  type: 'product' | 'filament' | 'supply';
  label: string;
  current_stock: number;
  threshold: number;
  unit: string;
  href: string;
};
```

Product rule:

- If `fixed_products` already has a minimum-stock column in code, use it.
- If not, use MVP visibility rule `stock_quantity < 1` and response threshold
  `1`; do not add a product threshold migration in this feature.

### Unified Historial Movements (R15-R17)

Existing Historial separates filament and supply filters, and product movements
are separate. Add a unified API feed/read model rather than migrating movement
rows into one table.

Recommended endpoints:

| Method | Route | Request | Response |
|---|---|---|---|
| `GET` | `/api/stock/movement-items` | Authenticated; optional `q` search | Options for Productos, Filamentos and Insumos with type labels |
| `GET` | `/api/stock/movements/unified` | Authenticated query: pagination, date range, movement type, `item_keys[]` where each key is `product:<id>`, `filament:<id>` or `supply:<id>` | Paginated normalized movements plus `total` |

Option shape:

```ts
type MovementItemOption = {
  key: string; // product:<uuid>, filament:<uuid>, supply:<uuid>
  id: string;
  type: 'product' | 'filament' | 'supply';
  type_label: 'Producto' | 'Filamento' | 'Insumo';
  label: string;
};
```

Movement row shape:

```ts
type UnifiedMovement = {
  id: string;
  source: 'product' | 'stock_movement';
  item_id: string;
  item_type: 'product' | 'filament' | 'supply';
  item_type_label: 'Producto' | 'Filamento' | 'Insumo';
  item_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  order_id: string | null;
  created_at: string;
  created_by_user_id: string | null;
  metadata: Record<string, unknown>;
};
```

Unified movement flow:

```text
Historial opens
  -> GET /api/stock/movement-items for multi-select options
  -> operator selects any Productos/Filamentos/Insumos
  -> frontend sends item_keys[] with pagination/filter query
  -> backend queries product movement source + stock_movements
  -> backend normalizes rows, sorts by created_at, paginates
  -> frontend renders one Historial table with type labels and resettable empty state
```

Backend implementation can use SQL `UNION ALL` or two/three queries merged in
Python if that is simpler and still paginates deterministically. Preserve tenant
filtering by authenticated `user_id` for every source.

## Frontend Design

### Files and Components

Exact file names may vary; implement in the existing dashboard/App Router
structure.

| Area | Likely files/components | Change |
|---|---|---|
| Favicon | `src/app/layout.tsx`, `src/app/auth-context.tsx`, Perfil page, API client | Default `/logo.svg`; use returned `favicon_url` for `<link rel="icon">`; add Perfil favicon card. |
| Feedback | Dashboard layout/provider, shared API/mutation hooks | Add central feedback provider/hook and route all dashboard mutation success/error messages through it. |
| Error normalization | API client/shared frontend utility | Add `normalizeApiError(err, fallback)` and replace `err.detail || fallback` style rendering. |
| Low stock | Dashboard overview/shell/nav, Productos, Filamentos, Insumos pages | Add product low-stock entries and visible "Stock bajo" surfaces. |
| Filters | Pedidos, Productos, Filamentos, Insumos, Historial table cards | Place common filters inline inside cards; advanced section for extra filters; reset pagination on changes. |
| Historial | Historial page, movement API client, filter components | Replace separate filament/supply filters with unified item multi-select that includes Productos. |
| Drawers | Producto, Filamento, Insumo, Impresora and similar CRUD forms | Replace centered create/edit modals with responsive drawers. |
| Details | Product detail page; related Filamento/Insumo detail cards | Redesign cards for distinctive, fast-scannable hierarchy. |
| App Router errors | `not-found.tsx`, `error.tsx`, `global-error.tsx`, route-level states | Add Spanish 404, 503/offline/server-unavailable, retry and safe navigation experiences. |

### Global Feedback Pattern (R8, R9)

Create a single dashboard feedback surface, likely a MUI `Snackbar`/`Alert`
provider under the dashboard shell. Existing Perfil-local snackbar can guide tone
and interaction, but the state must be centralized so pages do not invent their
own one-off patterns.

Message guidelines:

- Success: short verb-first Spanish messages, for example "Producto guardado",
  "Stock ajustado", "Pedido archivado".
- Error: use `normalizeApiError(error, fallback)`; fallback messages should name
  the action.
- Do not use feedback popups as the only source of critical form validation;
  field-level errors remain near fields.

### Shared Error Normalizer (R9, R18-R22)

Add a shared frontend helper used by API/mutation error handling.

Inputs to handle:

- string errors.
- `Error` instances.
- FastAPI `{ detail: string }`.
- FastAPI validation arrays, including `[{ loc, msg, type }]`.
- arbitrary arrays and objects.
- network failures/offline/unavailable responses.
- unknown thrown values.

Output must always be Spanish readable text and never `[object Object]`.

Pseudo-contract:

```ts
normalizeApiError(error: unknown, fallback = 'Ocurrió un error'): string
```

Search and replace call sites that directly render `err.detail || fallback`,
`String(error.detail)` or similar. Include the budget form earnings margin empty
case from `generate_budget`: when margin is missing or invalid, show a specific
Spanish message rather than a serialized object.

### Filters in Table Cards (R13, R14)

Put filters inside the visual table/card container so filtering feels attached
to the data being filtered.

Page guidance:

- Pedidos: inline status/search/date basics; advanced for category/delivery or
  additional criteria if crowded.
- Productos: inline search/status/stock basics; advanced for price/category-like
  criteria if available.
- Filamentos: inline search/material/color/stock basics.
- Insumos: inline search/category/stock basics.
- Historial: inline unified item multi-select and date range basics; advanced for
  movement type/source/order-related criteria.

Every filter change resets pagination to page 1, updates counts and keeps empty
states scoped to active filters.

### Drawers for CRUD (R23-R25)

Create/edit flows for Producto, Filamento, Insumo, Impresora and similar
dashboard entities should open in context-preserving drawers.

Desktop behavior:

- Right-side drawer.
- The table/list remains visible behind or beside the panel.
- Closing without save preserves table pagination/filters.

Mobile behavior:

- Full-width/full-screen drawer or bottom-sheet-style panel.
- Primary/secondary actions remain reachable.
- No horizontal body overflow.

Keep small confirmation dialogs for destructive actions and focused
transactional dialogs when the user must explicitly confirm one narrow action.

Drawer flow:

```text
Operator clicks Crear/Editar
  -> drawer opens with current table filters untouched
  -> form validates and submits
  -> mutation succeeds or fails
  -> global feedback popup shows result
  -> affected query invalidates/refetches
  -> drawer closes on success or stays open on validation error
```

### Detail Card Visual Design (R26, R27)

Product detail currently uses simple horizontal cards. Redesign product detail
cards into a more distinctive but operationally clear layout:

- Prioritize scan zones for stock, price, status and key metadata.
- Use visual hierarchy, grouping, iconography or asymmetric layout deliberately;
  avoid generic same-size admin stat cards.
- Preserve predictable labels and fast lookup; creativity cannot hide data.
- Apply the same principle to Filamento/Insumo detail pages where practical.

### App Router Error States (R18-R20)

Add user-friendly Spanish error experiences compatible with Next.js App Router:

- `not-found.tsx` for dashboard-safe 404 copy and navigation.
- `error.tsx` for route segment errors with retry.
- `global-error.tsx` for top-level fallback.
- Route/data-fetch states for page-level 404, 503/offline/server unavailable and
  empty states where errors are caught before App Router boundaries.

503 copy must clearly mention service unavailable/server unavailable/offline and
offer retry or return navigation. Do not show raw stack traces or object dumps.

### Responsive Design (R28, R29)

Responsive behavior is a first-class acceptance path for:

- shell/nav and overview.
- Pedidos.
- Productos and product detail.
- Filamentos and filament detail.
- Insumos.
- Impresoras.
- Perfil.
- Historial.
- error pages and empty states.

Verify 320, 375, 414, 768 and desktop widths. Tables may use deliberate
horizontal scroll or transform into cards/lists; they must not accidentally blow
out the layout. Filters, drawers and detail cards must adapt at the same widths.

### Hallmark Verification (R30)

Implementation verification must include an extended Hallmark anti-AI-sloppiness
audit for dashboard and subsequent dashboard pages. The audit is not run during
spec authoring. It should be recorded in `progress/impl_dash_enhancement.md`.

Audit checklist:

- Non-generic dashboard composition; no templated AI-looking admin UI.
- Visual polish: spacing, hierarchy, density, empty states, typography and
  consistent Spanish terminology.
- Responsive behavior at required widths.
- Detail cards are distinctive but still fast to scan.
- Drawers and filters feel integrated, not bolted on.

## Technical Decisions

**Chosen: dedicated favicon URL over reusing logo URL.** The product decision is
that `logo_url` is the dashboard business isotype and `favicon_url` is a separate
tab/logotype slot. Reusing `logo_url` would couple two surfaces and prevent a
custom favicon.

**Chosen: backend mtime cache-busting over frontend `Date.now()`.** Existing logo
cache-busting already belongs in storage URL generation. Backend mtime versioning
keeps URLs stable until the file changes, avoids unnecessary cache misses and is
testable in API responses. Frontend `Date.now()` is discarded except as an
emergency fallback if an old non-versioned URL is encountered during migration.

**Chosen: central dashboard feedback over page-local snackbars.** A global
pattern keeps create/update/delete/archive/restore/upload/remove/stock/status/save
messages and low-stock popup notifications consistent. Isolated Perfil-style
snackbars are discarded as the final architecture, though their tone and UI can
inform the shared implementation.

**Chosen: product low-stock MVP rule over product threshold migration.** The user
requested product low-stock visibility without excessive data-model scope. If no
existing min threshold exists, `stock_quantity < 1` gives useful visibility now
without new product settings UX or migration. Popup dismissal is intentionally a
frontend notification concern and does not change stock state or persistent
low-stock visibility.

**Chosen: unified movement read model over merging movement tables.** Historial
needs one filter/control and one table view, but ownership remains split between
stock and product management. A read-model endpoint preserves source metadata and
avoids risky data migration.

**Chosen: drawers for create/edit over centered CRUD modals.** Drawers preserve
table/list context and improve dashboard workflow. Small destructive confirmation
dialogs remain because they are focused and safer than large drawers for one
decision.

**Chosen: deliberate mobile table strategy over forcing desktop tables.** At
small widths, each page may use horizontal scroll or card/list transformation,
but the choice must be intentional and verified.

## Verification

Automated verification:

- Backend tests for favicon endpoints, cache-busted URL response, invalid upload,
  unauthenticated access and file replacement/removal.
- Backend tests for product low-stock inclusion and no-product-low-stock empty
  response.
- Backend tests for unified movement item options and filtered unified movement
  feed across product, filament and Insumo keys.
- Frontend tests for global feedback success/error rendering and low-stock popup
  display/dismissal.
- Frontend tests for `normalizeApiError`, including FastAPI validation arrays,
  objects, arrays, network failures and the earnings margin empty case.
- Frontend tests for filter pagination reset and empty/count correctness.
- Frontend tests for drawer behavior where practical.
- `npx tsc --noEmit`, `npm run build`, backend `pytest`.

Manual verification:

- Default and custom favicon behavior including replacement/removal.
- Stock bajo popup display/dismissal plus persistent visibility in nav/dashboard
  and entity pages after popup dismissal.
- Filters inside table cards for Pedidos, Productos, Filamentos, Insumos and
  Historial.
- Unified Historial multi-select with Productos, Filamentos and Insumos.
- 404, 503/offline/server unavailable and global error pages.
- Drawer behavior on desktop and mobile.
- Responsive pass at 320, 375, 414, 768 and desktop.
- Extended Hallmark audit recorded in implementation progress.
