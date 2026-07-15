# Authentication — Design

## Tables

### `users` (exists)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL |

### `otp_codes` (new)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| code | VARCHAR(6) | 6-digit numeric |
| expires_at | TIMESTAMPTZ | NOW() + 10min |
| used_at | TIMESTAMPTZ | NULL until verified |

Created by `specs/create_order/` — no, actually created by this feature. Following `docs/data_model.md`, it's created by `authentication`.

## Endpoints

### POST `/api/auth/login`
- **Auth:** none (public)
- **Request:** `{ "email": str, "password": str }`
- **Response 200:** `{ "user": { id, email, name }, "otp_required": true }` + sets `access_token` as HTTP-only cookie
- **Response 401:** `{ "detail": "Invalid credentials" }`
- **Flow:**
  1. Lookup user by email
  2. Verify password with bcrypt
  3. Generate JWT with claims: `sub`=user_id, `email`, `otp_verified`=false
  4. Create OTP code, store in `otp_codes`, send to user email
  5. Set JWT as HTTP-only, Secure, SameSite=Lax cookie named `access_token`
  6. Return user info + `otp_required: true` (no token in body)

### POST /api/auth/otp/verify
- **Auth:** Cookie (`access_token`) or Bearer header
- **Request:** `{ "code": str }`
- **Response 200:** `{ "detail": "OTP verified" }` + updates `access_token` cookie with `otp_verified=true`
- **Response 401:** invalid/expired code
- **Flow:**
  1. Extract user_id from JWT (cookie or Bearer)
  2. Find matching `otp_codes` row where user_id matches, code matches, not yet used, not expired
  3. Mark `used_at = NOW()`
  4. Issue new JWT with `otp_verified`=true
  5. Update the `access_token` cookie with the new JWT

### GET /api/auth/me
- **Auth:** Cookie (`access_token`, requires otp_verified=true)
- **Response 200:** `{ "id": UUID, "email": str, "name": str }`
- **Response 401:** invalid/missing token or OTP not verified

### POST /api/auth/register
- **Auth:** Cookie (`access_token`, requires otp_verified=true)
- **Request:** `{ "email": str, "name": str, "password": str }`
- **Response 201:** `{ "id": UUID, "email": str, "name": str }`
- **Response 409:** email already exists
- **Flow:**
  1. Hash password with bcrypt
  2. Insert user
  3. Return user profile

### POST /api/auth/logout
- **Auth:** Cookie (any state)
- **Response 200:** `{ "detail": "Logged out" }`
- **Flow:** clears the `access_token` cookie (set Max-Age=0)

### POST /api/auth/otp/resend (optional, nice-to-have)
- **Auth:** Cookie (any state)
- **Response 200:** `{ "detail": "OTP sent" }`
- Resends a new OTP, invalidates previous unused ones

## JWT Token Format

Algorithm: HS256
Claims:
```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "otp_verified": false,
  "exp": 1234567890
}
```

The existing `get_current_user` dependency in `api/deps.py` will be extended to:
- `get_current_user` — reads JWT from `access_token` cookie, falls back to `Authorization: Bearer` header. Requires valid JWT, any state (baseline — for endpoints that work before OTP, like `/otp/*`)
- `get_verified_user` — reads JWT from cookie/header, requires valid JWT + `otp_verified=true` (for `/api/orders`, `/api/auth/me`)

**Cookie config:** HTTP-only, Secure (in production), SameSite=Lax, path=/api, max-age=JWT_EXPIRE_MINUTES

## Frontend

The JWT lives in an HTTP-only cookie — the frontend never reads or writes it directly. All fetch calls use `credentials: "include"` so the cookie is sent automatically.

### Login page (`/login`)
- Email + password form
- On success, redirect to `/verify-otp`
- No token handling needed — cookie is set by the server

### OTP page (`/verify-otp`)
- 6-digit input
- On success, redirect to `/dashboard`
- "Reenviar código" button → calls `/api/auth/otp/send`
- All calls use `credentials: "include"`

### Auth context
- React context wrapping the app
- Provides: `user`, `login()`, `logout()`, `isAuthenticated`
- On mount, calls `GET /api/auth/me` with `credentials: "include"` to validate the cookie
- If the cookie is invalid/expired, sets `user` to null, redirects to `/login`

### Logout
- Calls `POST /api/auth/logout` which clears the `access_token` cookie on the server
- Redirects to `/login`

### Protected routes
- Client-side check: if `user` is null after auth context loads, redirect to `/login`

### Dashboard changes
- Replace the manual JWT token input with auth context
- Show current user name
- "Cerrar sesión" calls `logout()`

## Discarded Alternatives

1. **OTP as SMS/TOTP** — Rejected per architecture summary: email-only for MVP.
2. **Passwordless login** — Considered but rejected because admin needs password-based access for seed/script usage.
3. **Sessions table + refresh tokens** — Overkill for single-user MVP. JWT with 24h expiry is sufficient. Can be added later for multi-tenant.
4. **No OTP** — Architecture dictates 2FA is part of the auth model. Rejected.
5. **JWT in localStorage** — Simpler to implement (no CSRF concerns) but vulnerable to XSS. Rejected in favor of HTTP-only cookies, which are not readable by JS. CSRF is mitigated by SameSite=Lax.

## Flow Diagram

```
Browser                     Backend                       Email
  │                           │                             │
  │  POST /api/auth/login     │                             │
  │  {email, password}        │                             │
  │ ────────────────────────► │                             │
  │                           │  verify bcrypt              │
  │                           │  create OTP, store in DB    │
  │                           │  ──────────────────────────►│  send OTP email
  │  ◄──────────────────────── │                             │
  │  Set-Cookie: access_token │                             │
  │  {user, otp_required}     │                             │
  │                           │                             │
  │  POST /api/auth/otp/verify│                             │
  │  {code: "123456"}         │                             │
  │  (Cookie: access_token)   │                             │
  │ ────────────────────────► │                             │
  │                           │  verify OTP, mark used       │
  │  ◄──────────────────────── │                             │
  │  Set-Cookie: access_token │                             │
  │  (otp_verified=true)      │                             │
  │                           │                             │
  │  GET /api/auth/me         │                             │
  │  (Cookie: access_token)   │                             │
  │ ────────────────────────► │                             │
  │  ◄──────────────────────── │                             │
  │  {id, email, name}        │                             │
```
