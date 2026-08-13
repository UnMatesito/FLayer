# Tasks — dash_enhancement

## Backend

- [ ] `models/user.py`: add `favicon_path` column (String(500), nullable) next
      to `logo_path` (R2, R3)
- [ ] `schemas/auth.py`: add `favicon_url` to `UserResponse`; include it in
      `_user_response` in `api/auth.py` (R2)
- [ ] `services/storage_service.py`: add `save_favicon(file, user_id)` mirroring
      `save_logo` — uploads/favicon_<user_id><ext>, same validation (R3)
- [ ] `api/auth.py`: add `POST /me/favicon` and `DELETE /me/favicon` mirroring
      the `/me/logo` handlers (get_verified_user, 422 validation, replace file
      on re-upload, clear path + delete file on remove) (R3)
- [ ] Tests: favicon upload (sets `favicon_url`), re-upload (old file replaced),
      delete (clears path + file), 422 bad type/size, 401 unauthenticated (R3)

## Frontend

- [ ] `api.ts`: add `favicon_url` to the `User` type and `uploadFavicon` /
      `removeFavicon` functions (R2, R4)
- [ ] Profile settings: add "Favicon" card next to "Logotipo" — preview,
      upload, remove, pending states, errors; `refreshUser` after mutations;
      existing "Logotipo" card untouched (R4)
- [ ] Favicon default: add `icons: [{ rel: 'icon', url: '/logo.svg' }]` to the
      root layout metadata in `src/app/layout.tsx` (R1)
- [ ] Personal tab icon: in `src/app/auth-context.tsx`, alongside the existing
      `document.title` effect, set/reset the `<link rel="icon">` href from
      `user.favicon_url` with a per-session `?v=` cache-bust; reset to
      `/logo.svg` when null (R2)
- [ ] Verify: `npx tsc --noEmit`, `npm run build`, backend `pytest` (all R)

## Manual pass

- [ ] Tab icon shows the `logo.svg` isotype by default (R1)
- [ ] Upload a favicon in Profile → tab icon shows it; replace it → icon updates;
      remove it → isotype returns (R2)
- [ ] The business logo (isotype) stays independent of favicon operations (R2,
      R4)