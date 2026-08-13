# Design — dash_enhancement

Full-stack feature: a user column + two endpoints (backend) and the tab-icon
wiring + Profile card (frontend). First deliverable of the dashboard enhancement
line; depends on `brand_identity` for the Flayer isotype (`logo.svg`), which is
the default favicon. Moved from `brand_identity` (2026-08-12, human decision) so
that feature stays frontend-only.

Human decision (2026-08-12): the favicon is its own slot — the business `logo_url`
is the tenant isotype (dashboard brand mark); the tab icon is where tenants place
their logotype, and it must not reuse `logo_url` (R2).

## Favicon default (R1)

Root layout `src/app/layout.tsx` — add `icons: [{ rel: 'icon', url: '/logo.svg' }]`
to `metadata`. Next.js serves the isotype from `/public` at `/logo.svg`. No
`favicon.ico` conversion: browsers render SVG favicons natively; the isotype
asset stays single source of truth.

## Backend — favicon column and endpoints (R2, R3)

Mirrors the existing logo machinery end to end:

- **Model** — `src/backend/models/user.py`:
  `favicon_path: Mapped[str | None] = mapped_column(String(500), nullable=True)`,
  next to `logo_path`. Dev DB is model-first (`Base.metadata.create_all`,
  `main.py:29` — no alembic); the column appears on a fresh dev database, and
  pre-existing dev DBs must be reconciled manually (documented limitation of the
  create_all pattern).
- **Schema** — `src/backend/schemas/auth.py`: add `favicon_url: str | None`
  alongside `logo_url`.
- **Response builder** — `src/backend/api/auth.py` `_user_response` (line 37):
  `favicon_url = storage_service.get_file_url(user.favicon_path) if
  user.favicon_path else None`.
- **Storage** — `src/backend/services/storage_service.py`: `save_favicon(file,
  user_id)` mirroring `save_logo` (same validation: jpeg/png/webp, ≤10 MB;
  filename `uploads/favicon_<user_id><ext>`).
- **Endpoints** — `src/backend/api/auth.py`: `POST /me/favicon` and
  `DELETE /me/favicon` copying the `/me/logo` handlers (lines 194–225):
  `get_verified_user`, 422 on validation errors, replacing the previous file on
  re-upload, clearing path + deleting file on remove.

## Tab wiring (R2)

In `src/app/auth-context.tsx`, alongside the existing `document.title` effect
(lines 37–39), an effect on `user?.favicon_url` sets the page's
`<link rel="icon">` href:

- `favicon_url` set → `href = "${favicon_url}?v=${Date.now()}"`
- null → `href = "/logo.svg"`

`favicon_url` is served by the existing `/uploads` StaticFiles mount, so the tab
fetch needs no auth headers.

**Cache-busting**: the uploaded file path `/uploads/favicon_<user_id>.<ext>` is
stable across re-uploads, and browsers cache favicons per-URL — without a nonce,
replacing the favicon would keep the old tab icon. The per-session `?v=` nonce
forces a fresh fetch.

**Limitation**: the swap happens client-side once `fetchMe` resolves; until then
the tab shows the isotype. Some browsers are sticky about live icon updates —
the personalized icon appears on the next load of a new session. Acceptable for
a local MVP; recorded so it is not mistaken for a bug.

## Profile settings — Favicon card (R4)

`src/app/dashboard/profile/page.tsx`, next to the existing "Logotipo" card
(lines 531–557), same interaction pattern:

- Preview of the current favicon (`user.favicon_url`), or "Se muestra el isótopo
  Flayer" placeholder when null.
- "Subir favicon" (hidden file input, `uploadFavicon` mutation) and
  "Quitar favicon" (`removeFavicon`) — wired to the new endpoints; disabled while
  pending; errors shown via the existing `FieldError`.
- The existing "Logotipo" card is untouched (it stays the business isotype for
  the dashboard).
- `api.ts`: `uploadFavicon` / `removeFavicon` functions + `favicon_url` on the
  `User` type; `refreshUser` after either mutation keeps the auth context (and
  the tab icon effect) in sync.

## Technical decisions

**Chosen: dedicated favicon column + endpoints over reusing `logo_url`.**
Human decision: the business logo is the tenant isotype (dashboard brand mark);
the tab icon is its own slot so tenants can store their logotype there. Reusing
`logo_url` would couple two unrelated surfaces and block a distinct favicon
(R2, R3). The column + two endpoints mirror the proven `/me/logo` machinery — no
new patterns.

**Chosen: client-side favicon override over a server-rendered icon endpoint.**
Auth is Authorization-header based; browser icon fetches cannot send custom
headers, so a per-user server-rendered icon would require new cookie auth —
ceremony for a local MVP. The frontend already holds `favicon_url`; the
tab-follows-favicon behavior is a few lines in the auth context (R2).

## Verification

- Backend: `pytest` — new `POST/DELETE /me/favicon` tests (valid upload sets
  `favicon_url`, re-upload replaces the stored file, delete clears path + file,
  422 on bad type/size, 401 unauthenticated) (R3)
- `npx tsc --noEmit` + `npm run build` — all R's compile and routes resolve
- Manual pass: tab icon shows the `logo.svg` isotype by default (R1)
- Manual pass: uploading a favicon in Profile swaps the tab icon; replacing
  updates it; removing restores the isotype (R2)
- Manual pass: business logo (isotype) is unaffected by favicon operations (R2,
  R4)