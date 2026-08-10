# Design — dashboard

Mission-control home page + `GET /api/dashboard/summary` aggregation endpoint.
Reads existing tables only — **no schema changes**. The aggregation service is
the future foundation of the `reports` feature.

## Tables touched (all read-only, see `docs/data_model.md`)

| Table | Reads | Purpose |
|---|---|---|
| `orders` | rows + aggregates | KPI counts, revenue, activity, recent orders |
| `customers` | join via `orders.customer_id` | `customer_name` on recent orders |
| `budgets` | latest version per order | final value of print orders, budgeted quoting value |
| `filaments` | aggregate + filtered list | low-stock list + count |
| `supplies` | aggregate + filtered list | low-stock list + count |
| `printers` | active rows | printer bay + count |
| `printer_maintenance` | month count per printer | maintenance-month KPI |

No schema changes for the summary endpoint itself. All queries scoped by `user_id`.
The branding personalization below adds two columns to `users` and one new
migration.

## Branding schema — `users` gains two columns (new migration)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `primary_color` | VARCHAR(7) | nullable, `CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$')` | Hex accent, `#RRGGBB`. `NULL` = default accent (`ember`) |
| `logo_path` | VARCHAR(500) | nullable | Relative path of the saved logo file under `uploads/`, e.g. `uploads/logo_<user_id>.png`; `NULL` = Flayer wordmark fallback |

Migration `014_add_user_branding.py` (Alembic — see `src/alembic/versions/`).
**Implementation note:** the dev lifespan uses `Base.metadata.create_all`,
which does NOT add columns to an already-existing `users` table — the migration
must be applied (`alembic upgrade head`) or the profile endpoints will 500 on
`users.logo_path`/`primary_color`. This is the established workflow: `make
setup` runs `alembic upgrade head`, and prior features applied migrations the
same way (printers used 012/013) — no deviation, just required (R12–R18). `name` is reused as-is (String(255), already
required) — no duplicate name field is added.

The logo file itself lives on disk via the existing `storage_service`
(`uploads/logo_<user_id><ext>`, ext from validated content type). The API
exposes `logo_url` (derived with `get_file_url`) and never the raw `logo_path`.

## Branding endpoints (auth/me family — `src/backend/api/auth.py`)

| Method | Route | Auth | Usage |
|---|---|---|---|
| `PATCH` | `/api/auth/me` | Verified | Update `name` and/or `primary_color` (R12, R13, R14) |
| `POST` | `/api/auth/me/logo` | Verified | Upload/replace business logotype (R16, R17) |
| `DELETE` | `/api/auth/me/logo` | Verified | Remove logotype (R18) |
| `GET` | `/api/auth/me` | Verified | Existing — response extended with branding fields (R19) |
| `POST` | `/api/auth/register` | Verified | Existing — request extended with optional `primary_color` (R15) |

All use `get_verified_user` (the same gate as `GET /me`): branding changes
require an OTP-verified session. `current_user` IS the target — there is no
`user_id` parameter, so cross-user access is structurally impossible (R23).

### `PATCH /api/auth/me` — Request (JSON)

```json
{ "name": "Ana Gómez", "primary_color": "#E4572E" }
```

Both fields optional; only provided fields change. `primary_color`: exactly
`#RRGGBB` (validated with a Pydantic field validator, case-normalized to
uppercase), or `null` to clear (R14). `name`: trimmed, non-empty, ≤ 255.
Unknown body fields → 422 (R23). Response: 200 `UserResponse` (extended).

### `POST /api/auth/me/logo` — Request (multipart)

`file` field. Validated by `storage_service.validate_image` (jpeg/png/webp,
≤ 10 MB). Invalid type or size → 422, nothing saved, previous logo intact
(R17). Success saves to `uploads/logo_<user_id><ext>` (replacing any previous
file — stale files are deleted), sets `logo_path`, returns 200 `UserResponse`
with the new `logo_url` (R16).

### `DELETE /api/auth/me/logo` — Response 200

Clears `logo_path`, deletes the saved file from disk, returns `UserResponse`
with `logo_url: null` (R18).

### `UserResponse` (changed) and register (changed)

```json
{
  "id": "uuid",
  "email": "ana@flayer.com",
  "name": "Ana Gómez",
  "primary_color": "#E4572E",
  "logo_url": "/uploads/logo_<uuid>.png"
}
```

`logo_url` is computed in the router/service from `logo_path` via
`get_file_url`; it is `null` when no logo (R19). `RegisterRequest` gains
optional `primary_color` (same hex validator, omitted → null) so the color can
be set at creation (R15). `RegisterResponse` gains `primary_color`
(symmetry); the logo is never settable at register time (see decision below).

## Endpoint

| Method | Route | Auth | Usage |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Required (`get_current_user`) | One-request snapshot of the home page (R1–R8) |

### Response (200)

```json
{
  "as_of": "2026-08-04T12:00:00Z",
  "kpis": {
    "orders_month": 7,
    "revenue_month": 132450.00,
    "pending_orders": 3,
    "printing_orders": 2,
    "budgeted_value_quoting": 84500.00,
    "low_stock_filaments": 2,
    "low_stock_supplies": 1,
    "printers_active": 3,
    "maintenance_month": 2
  },
  "activity": [
    { "date": "2026-07-22", "orders": 0, "revenue": 0.00 },
    { "date": "2026-07-23", "orders": 3, "revenue": 42000.00 }
  ],
  "recent_orders": [
    {
      "id": "3f2a9c1e-...-uuid",
      "short_id": "3f2a9c1e",
      "customer_name": "Ana Gómez",
      "work_type": "impresion_3d",
      "status": "printing",
      "final_value": 15000.00,
      "created_at": "2026-08-04T09:12:00Z"
    }
  ],
  "low_stock": {
    "filaments": [
      { "id": "uuid", "color_name": "PLA Amarillo", "weight_grams": 80.00, "min_stock_warning_grams": 250.00 }
    ],
    "supplies": [
      { "id": "uuid", "name": "Isopropanol 99%", "quantity": 0.20, "unit": "liters", "min_stock_warning": 1.00 }
    ]
  },
  "printers": [
    { "id": "uuid", "name": "Ender 3", "brand": "Creality", "model": "Ender 3 Pro", "maintenance_month": 1 }
  ]
}
```

### Field semantics (the spec contract — tests assert these exactly)

- `as_of` — server UTC timestamp of the snapshot (ISO 8601).
- `kpis.orders_month` — count of orders with `created_at` in the current UTC
  calendar month. All statuses.
- `kpis.revenue_month` — sum of **final value** of orders created in the current
  UTC month, excluding `status = 'cancelled'`.
- `kpis.pending_orders` — count of orders with `status` in (`new`, `quoting`).
- `kpis.printing_orders` — count of orders with `status = 'printing'`.
- `kpis.budgeted_value_quoting` — sum of the **latest** budget `final_price`
  over orders currently `quoting` (0 when none).
- `kpis.low_stock_filaments` / `low_stock_supplies` — count of active filaments
  with `weight_grams < min_stock_warning_grams` / active supplies with
  `quantity < min_stock_warning`.
- `kpis.printers_active` — count of printers with `is_active = true`.
- `kpis.maintenance_month` — count of `printer_maintenance` records with
  `maintenance_date` in the current UTC month **whose printer is active**.
- `activity` — exactly 14 entries, one per UTC day, `date` = `YYYY-MM-DD`,
  oldest first, ending today. `orders` = non-`cancelled` orders created that
  day; `revenue` = sum of their final values. Zero-filled days included.
- `recent_orders` — the 5 most recent non-`cancelled` orders by `created_at`
  desc. `short_id` = first 8 chars of the id. `final_value` uses the same rule
  as revenue.
- `low_stock` — same shape as the existing `GET /api/stock/low-stock`.
- `printers` — active printers only; `maintenance_month` = count of that
  printer's maintenance records in the current month.

**Final value rule (one definition everywhere):**
`COALESCE(latest budget final_price, orders.total, 0)`, where "latest budget" =
the budget with the highest `version` for the order (the pair is unique,
`uq_budget_order_version`). Used by `revenue_month`, `activity[].revenue`,
`recent_orders[].final_value`, and `budgeted_value_quoting`.

**Windows:** "current month" and "day" are UTC calendar units of the server's
`now()`. Documented explicitly so boundary tests are deterministic.

### Query plan (batched — no N+1, no per-row queries)

One async service function runs a fixed set of aggregate/scalar queries, all
scoped `user_id = current_user.id`:

1. **Latest budget per order** — one query:
   `SELECT DISTINCT ON (order_id) order_id, version, final_price FROM budgets WHERE user_id = :uid ORDER BY order_id, version DESC`.
2. **Month KPIs (orders + revenue + quoting value)** — one grouped query over
   orders LEFT JOIN subquery (1) on `order_id`, filtered to the current month,
   producing `orders_month`, `revenue_month`, `budgeted_value_quoting`, and
   per-status counts in a single pass.
3. **Activity (14 days)** — one query: orders where `created_at >= today-13`
   and `status != 'cancelled'`, `GROUP BY created_at::date`, joined with the
   latest-budget subquery for revenue. Python merges into the 14-date key
   frame with zero-fill.
4. **Recent orders (5)** — one query: 5 most recent non-`cancelled` orders
   with an inner join to `customers` and a LEFT JOIN to (1) for `final_value`.
5. **Low stock** — two queries (same predicates as `GET /api/stock/low-stock`).
6. **Printer bay** — one query over active printers LEFT JOIN a per-printer
   monthly maintenance count subquery.

≈ 7 queries total per request, all indexed/aggregate, all tenant-scoped.

## Technical decisions (with discarded alternatives)

**Chosen: one new aggregation endpoint, `GET /api/dashboard/summary`.**
Discarded: (a) having the home page fan out to the existing endpoints
(`/api/orders`, `/api/stock/low-stock`, `/api/printers`, `/api/orders/{id}/budget`
per order — the current home already smells of this with N fetches and a
recent-orders list that lacks customer names); (b) computing KPIs client-side.
Chosen: a single request returns everything the home page needs, is one testable
contract, and gives the page a consistent snapshot instead of a jitter of
partially-loaded fetches. The existing `/api/stock/low-stock` endpoint stays
unchanged — the dashboard sidebar badge keeps using it (already shipped), while
the dashboard body uses the summary payload.

**Chosen: aggregation lives in a service (`dashboard_service.build_summary`),
not inline in the router.**
Discarded: router-inline queries. Chosen: `reports` (next feature) will reuse
the same batched query layer; the service returns plain SQLAlchemy results and
the router maps them to the Pydantic response.

**Chosen: final value = `COALESCE(latest budget final_price, orders.total, 0)`.**
Discarded: summing `orders.total` alone — print orders carry their value in the
budget, not in `orders.total`; product orders carry it in `orders.total`.
Discarded: revenue only from `delivered` orders — for a solo print studio the
monthly readout is "work booked", which is what creation-date semantics give.
The single rule is applied uniformly and tested (R4).

**Chosen: latest budget = highest `version` per order.**
Discarded: `updated_at`-based selection. `version` is monotonically increasing
per order and the pair is unique (`uq_budget_order_version`), so it is
unambiguous; `updated_at` could tie.

**Chosen: activity window = last 14 UTC days including today, zero-filled.**
Discarded: calendar-month buckets (hides early-month shape), last-7 (too short
to read a rhythm). 14 days reads the studio's two-week cadence and keeps the
chart small. Zero-fill is computed in Python against a fixed date key frame, so
the endpoint always returns exactly 14 entries (R5).

**Chosen: recent orders excludes `cancelled`.**
Discarded: showing the raw latest 5. The queue's job is "what still needs me";
a cancelled order is dead weight. One `status != 'cancelled'` predicate,
tested (R6).

**Chosen: printer bay ships its maintenance counts inside the summary.**
Discarded: the frontend calling `fetchPrinterMaintenance` per printer (N+1,
slow home). One aggregate subquery keeps the round trip count at 1 (R8).

**Chosen: `maintenance_month` counts only maintenance on active printers.**
Discarded: counting all maintenance records for the tenant regardless of the
printer's `is_active`. The KPI's meaning is "attention needed on the current
fleet" — an archived machine's history should not inflate it. Archived printers
are excluded from `printers` and from the total (R8).

**Chosen: chart is a hand-rolled SVG React component, no library.**
Discarded: recharts, nivo, and `@mui/x-charts`. The page needs exactly one
small chart, and the signature "layer" rendering is custom anyway — a library
would add ~300 KB of dependency surface and a second theming vocabulary for
nothing. A plain SVG scales to any width, uses the theme tokens directly, and
keeps the aesthetic 100% ours.

**Chosen: the three home-page items (order form, orders table, store link)
move to a new `/dashboard/orders` hub.**
Discarded: keeping them on the home page (the clutter this feature exists to
fix); discarding them (they are working features). The orders detail route
`/dashboard/orders/[id]` already exists and is untouched; the new index page
sits beside it, and a "Pedidos" nav item makes the section discoverable (R10).

## Branding decisions

**Chosen: the logo is an uploaded image stored through the existing
`storage_service`, not a URL the user pastes.**
Discarded: a pasted logo URL — a remote hotlink can break or change behind our
back and cannot be validated as an image, while the repo already owns a
validated upload pipeline (`storage_service.validate_image` + `save_file`,
the exact mechanism behind `POST /api/products/{id}/image`). Reusing it means
one validation story (jpeg/png/webp, ≤ 10 MB) and one storage story app-wide.
Discarded: base64-embedding the logo in `users` — DB bloat, no upload
validation, and it bypasses the file storage the app already has.

**Chosen: `logo_path` is server-managed; clients only ever see `logo_url`.**
Discarded: letting `PATCH /api/auth/me` set a path/URL directly. A
client-supplied path would let the payload point the UI at arbitrary server
strings. Setting happens only via the upload endpoint (which validates the
bytes), clearing only via `DELETE /api/auth/me/logo`. The user-facing contract
exposes `logo_url` (derived through `get_file_url`) and never the raw path (R19).

**Chosen: register accepts an optional `primary_color`, but not a logo.**
Discarded: adding the logo to `RegisterRequest`. Register is a JSON endpoint;
the logo is a multipart upload that must be validated and stored — adding it
there means either base64-in-JSON (rejected above) or a two-step register
anyway. The color is one validated string, so it is cheap to accept at
creation (R15); the logo is always set later from the profile page (R16–R18).

**Chosen: profile endpoints require `get_verified_user`, like `GET /me`.**
Discarded: `get_current_user` (pre-OTP). Branding edits are the same security
class as reading `/me`: a session that has passed 2FA. Tests assert 401 for an
unauthenticated or unverified caller (R11).

**Chosen: dynamic accent via a `useMemo`-built MUI theme, not CSS variables.**
Discarded: per-component CSS variables driven by a data attribute on `<body>`.
MUI consumes palette tokens (`primary.main`) across chips, buttons, nav
`selected` states, and focus rings — sprinkling `var(--accent)` shims over
every consumer duplicates the theme in two places and breaks any component
that uses `primary` (including the future `reports` UI). Instead `providers.tsx`
restructures: `AuthProvider` wraps a `ThemedApp` that reads `user.primary_color`
and memoizes `createTheme(buildTheme(user.primary_color))` inside the existing
`ThemeProvider`. One source of truth; an update to the color re-renders the
theme immediately (R21). Default when null: `ember #E4572E`.

## Frontend

### Design direction — "the instrument panel of a print shop"

The subject is a 3D printing studio: machined metal, spools, the heated
nozzle, layer lines. The page's single job: in one glance, know where the
studio stands — what's running, what's waiting, what's low. The design is an
**instrument panel over a queue**: flat, cool, precise; one warm "live" accent;
the memorable thing is the chart that draws the week as extruded layers.

#### Palette (named tokens, in `theme.ts`)

| Token | Hex | Role |
|---|---|---|
| `plate` | `#F1F3F5` | page background — cool machined-aluminum grey, deliberately NOT cream |
| `snow` | `#FFFFFF` | card surfaces |
| `ink` | `#1C2127` | primary text — cool near-black |
| `slate` | `#5C6672` | secondary text, captions, labels |
| `line` | `#DFE4E9` | hairline rules between cells (used instead of heavy shadows) |
| `ember` | `#E4572E` | **default** signature accent — heated-nozzle amber. The user's `primary_color` replaces it in the SAME single-accent role when set (R21) |

No cream + serif + terracotta, no near-black + acid: the page stays light and
machined, and the accent is spent in exactly one place (the chart's today bar
and the single primary action). **Personalization keeps the restraint**: the
Maker's chosen color occupies the one-accent role (signature chart "today"
bar, active nav state, primary button, focus ring); order status chips keep
their semantic MUI colors, so the user's color never becomes a rainbow (R21).

#### Type (via `next/font/google`, wired in `theme.ts`)

| Role | Face | Weights | Used for |
|---|---|---|---|
| Display + body | **Overpass** | 400, 500, 600, 700 | Page title, section eyebrows, the status sentence, all UI labels and body text — geometric highway-sign character, a single family for display and body |
| Utility/data | **IBM Plex Mono** | 400, 500 | KPI numerals, dates, order IDs, chart axis labels — the instrument-panel voice |

Scale: page title 2rem/700 display; status sentence 1rem/400; KPI numeral
2.5rem/500 mono (tabular); KPI label 0.7rem uppercase, letter-spacing 0.12em,
slate; section eyebrow 0.72rem uppercase tracked slate; body 0.875rem; chart
axis 0.7rem mono.
Decision (changed 2026-08-04 at the human's request): Overpass replaces the
Space Grotesk + Inter pairing — its geometric, technical voice fits the panel
even better and unifies display + body in one family; IBM Plex Mono is kept
for numerals/data. If a fully offline build is ever required, swap to the
system stack (`ui-sans-serif` / `ui-monospace`) keeping the same scale — noted
as the only fallback.

#### Layout concept (one sentence + wireframe)

The home page reads like a live instrument panel above a print queue: a
signature 14-day layer-bar chart at the top, a flat four-cell KPI row of
oversized mono numerals, then two working columns — the order queue on the
left, the attention panel (low stock, printer bay, quick actions) on the
right.

```
┌──────────────────────────────────────────────────────────────┐
│ Vista general                                  jue, 14 ago    │  ← Space Grotesk title + mono date
│ 3 impresiones en curso · 2 filamentos por reponer            │  ← one-line status sentence
├──────────────────────────────────────────────────────────────┤
│   ▄▄  ▄▄▄▄  ▄▄  ▄▄▄▄▄  ▄▄  ▄▄  ▄▄▄▄  ▄▄▄▄▄▄  ▄▄▄▄  ██      │  ← SIGNATURE: layer-bar chart (SVG)
│   actividad · últimos 14 días · hoy en ember                 │     past bars in ink/slate layers,
│                                                              │     today drawn in ember
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 7        │ │ $132.450 │ │ 3        │ │ 3        │        │  ← KPI cells: mono numeral over
│  │ PEDIDOS  │ │ INGRESOS │ │ EN COLA  │ │ STOCK BAJO│       │     uppercase tracked label,
│  │ del mes  │ │ del mes  │ │ +2 a la  │ │ 2 fil · 1 │       │     hairline `line` separators,
│  │          │ │          │ │ impresora│ │ insumo    │       │     no icons, no shadows
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├──────────────────────────────┬───────────────────────────────┤
│ EN EL TALLER                 │ ATENCIÓN                      │
│ ┌──────────────────────────┐ │ ┌───────────────────────────┐ │
│ │ recent order rows (5):   │ │ │ STOCK BAJO               │ │
│ │  #3f2a9c1e  Ana  13:12   │ │ │  ● PLA Amarillo  80/250g  │ │
│ │  #91d0b3    Leo  09:04   │ │ │  ● Isopropanol  0.2/1L    │ │
│ │  … rows click → detail   │ │ │   [Ir a stock]            │ │
│ └──────────────────────────┘ │ ├───────────────────────────┤ │
│ [+ Nuevo pedido]             │ │ IMPRESORAS                │ │
│                              │ │  3 activas · 1 con mto.   │ │
│                              │ │  Ender 3 · Ender 5 · K1C  │ │
│                              │ │  [Ir a impresoras]        │ │
│                              │ └───────────────────────────┘ │
└──────────────────────────────┴───────────────────────────────┘
```

#### Signature element: the layer-bar chart

A custom `LayerBarChart` SVG component. Each of the 14 days is a bar whose
stacked horizontal striations echo extruded layer lines; past days render in
`ink`/`slate` layers, **today renders in the theme primary accent** — the
user's `primary_color` when set, `ember` by default (R21). The axis and the
"hoy" marker are IBM Plex Mono. It is the one memorable thing; everything else
on the page is quiet and disciplined (flat surfaces, hairlines, no card
shadows, no icon flair on KPIs). Motion: on first load the bars draw once (a
single height pass); `prefers-reduced-motion` renders them static. No hover
glitter, no looping animation.

#### Copy (Spanish, written from the operator's side)

- Page title: **Vista general** · meta line: the current date in mono.
- Status sentence (generated from KPIs, e.g.): `3 impresiones en curso · 2
  filamentos por reponer`.
- Empty chart: "La semana está en blanco — creá tu primer pedido." + button
  "Crear pedido".
- Error state: "No se pudo cargar la vista general." + "Reintentar" (retry,
  never a dead mood screen).
- Buttons keep one name through the flow: "Crear pedido" (button) → "Pedido
  creado" (toast), matching the existing order-flow vocabulary.

#### MUI v7 constraints

- `theme.ts` exposes a `buildTheme(accent: string)` factory: it adds the named
  tokens via `palette` module augmentation (`PaletteOptions.custom` with
  `plate/ink/slate/line/ember`), sets `typography` roles for the three faces,
  `shape.borderRadius` 6, and **maps the accent to `primary.main`**.
- Dynamic theming: `providers.tsx` restructures to `QueryClientProvider →
  AuthProvider → ThemedApp`, where `ThemedApp` calls `useAuth()` and memoizes
  (`useMemo`) `createTheme(buildTheme(user?.primary_color ?? null))` for the
  existing `ThemeProvider` — the unset/default accent is `ember`. Calling the
  profile update re-renders the theme immediately (R21).
- Component styles follow the repo pattern: typed `Record<string, SxProps<Theme>>`
  inline (< 100 lines) or a separate `.styles.ts` file (≥ 100 lines) — no
  hardcoded hexes outside `theme.ts`; accent usages always go through
  `primary.main`.
- v7 specifics: use `slots`/`slotProps` where deep customization is needed,
  no deprecated props; `theme.applyStyles('dark', …)` only if dark mode is
  ever added (out of scope now).
- Data fetching: TanStack Query v5, query key `['dashboard-summary']`, with
  `refetchInterval` ~60 s mirroring the layout's low-stock polling; skeleton
  via `Skeleton`, errors via the retry state above.

### New/changed frontend files

- `src/app/theme.ts` — palette tokens, fonts, type roles; `buildTheme(accent)`
  factory (R9, R21).
- `src/app/layout.tsx` — load the three fonts via `next/font/google` (R9).
- `src/app/providers.tsx` — restructure to `AuthProvider → ThemedApp` with a
  memoized `buildTheme(user.primary_color)` (R21).
- `src/app/auth-context.tsx` — extend `AuthContextValue` with `refreshUser()`
  (refetch `/me` and update `user`), so profile edits flow back into the theme
  and header (R19, R21).
- `src/app/api.ts` — extend `User` with `primary_color` and `logo_url`;
  `ProfileUpdate`, `uploadLogo`, `removeLogo`; keep `UserResponse`-derived
  `fetchMe` (R19, R20, R22). Plus `DashboardSummary` + nested types and
  `fetchDashboardSummary()` (R9).
- `src/components/LayerBarChart.tsx` — signature SVG chart, today's bar reads
  `primary.main` from the theme (R9, R21).
- `src/app/dashboard/page.tsx` — full rewrite: greeting with the Maker's name
  (R20), header + status sentence, LayerBarChart, KpiRow, two-column area
  (recent orders queue / attention panel), quick actions; skeleton/error/empty
  states (R9).
- New: `src/app/dashboard/orders/page.tsx` — orders hub hosting
  `StoreLink` (compact), `InternalOrderForm`, and `OrdersTable` (moved
  unchanged from the old home page) (R10).
- `src/app/dashboard/layout.tsx` — add "Pedidos" nav item (section "General",
  icon `ReceiptLong`) (R10); **replace the "Flayer" text in the `navHeader`
  block and the AppBar toolbar** with the logotype `<img>` (logo_url) when set,
  falling back to the "Flayer" wordmark when `logo_url` is null (R20). The
  Maker's name is NOT shown in the nav — it appears only in the home greeting.
- New: `src/app/dashboard/profile/page.tsx` — branding editor: name field,
  native `<input type="color">` + hex text (validates `#RRGGBB`, rejects empty
  string/invalid with inline error), logo upload input (jpeg/png/webp ≤ 10 MB,
  client-side size/type pre-check), and "Quitar logo" (calls `DELETE`); every
  save call ends with `refreshUser()` so theme, logotype, and greeting update
  immediately; inline errors mirror the backend 422s (R22).
- `src/app/dashboard/layout.tsx` — add "Mi perfil" entry near "Cerrar sesión"
  linking to `/dashboard/profile` (R22).
- `src/app/dashboard/orders/[id]/page.tsx` — untouched (already exists).

The moved components are used as-is; only the home page, the hub, the layout
branding, and the new profile page change.

## Data flow (GET /api/dashboard/summary)

```
Operator (home page) ──GET /api/dashboard/summary (cookie)──▶ Router
   ──▶ get_current_user (401 if no valid session) ──▶ dashboard_service.build_summary(db, user.id)
   ──▶ ~7 batched tenant-scoped queries (orders+budgets, activity, recent, low stock, printers)
   ──▶ Pydantic DashboardSummaryResponse ──▶ JSON ──▶ TanStack Query cache ['dashboard-summary']
   ──▶ page renders: chart (signature), KPI row, queue, attention panel
```

## Data flow (branding — profile edit)

```
Operator (profile page) ──► PATCH /api/auth/me {name, primary_color}   (JSON, verified)
Operator (profile page) ──► POST /api/auth/me/logo  (multipart file)    (verified)
Operator (profile page) ──► DELETE /api/auth/me/logo                    (verified)
   ──▶ validate (hex / storage_service) ── 422 on invalid ──▶ update users + disk
   ──▶ UserResponse (id, email, name, primary_color, logo_url) ──▶ auth-context refreshUser()
   ──▶ ThemeProvider re-renders (buildTheme(primary_color)) ──▶ layout logo/wordmark + greeting
```

## Out of scope

- Real-time/websocket updates (polling only).
- Dark mode, multi-currency revenue (single mixed "$" figure is an accepted
  MVP simplification; `region_parameters` is the future home of a workspace
  currency).
- Printable/exportable reports → the `reports` feature (reuses this service).
- Configurable dashboard widgets/drag-and-drop.
