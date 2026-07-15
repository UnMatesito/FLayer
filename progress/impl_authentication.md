# Implementation — authentication

## Files modified

### Backend (new)
- `src/backend/models/otp_code.py` — OtpCode model
- `src/backend/schemas/auth.py` — request/response schemas
- `src/backend/api/auth.py` — all auth endpoints (login, otp/send, otp/verify, me, register, logout)

### Backend (modified)
- `src/backend/api/deps.py` — `get_current_user` reads from cookie first (fallback Bearer), added `get_verified_user`
- `src/backend/models/__init__.py` — added OtpCode to exports
- `src/backend/main.py` — registered auth router
- `src/backend/services/email_service.py` — added `send_otp` to interface + implementation

### Frontend (new)
- `src/frontend/src/app/auth-context.tsx` — AuthProvider + useAuth hook
- `src/frontend/src/app/login/page.tsx` — login form
- `src/frontend/src/app/verify-otp/page.tsx` — OTP verification form
- `src/frontend/src/app/protected-route.tsx` — route guard component

### Frontend (modified)
- `src/frontend/src/app/api.ts` — added auth API functions (login, verifyOtp, sendOtp, fetchMe, logout), updated createInternalOrder/fetchActiveOrders to use credentials: "include"
- `src/frontend/src/app/providers.tsx` — wrapped app with AuthProvider
- `src/frontend/src/app/dashboard/page.tsx` — replaced manual token input with auth context + ProtectedRoute
- `src/frontend/src/components/InternalOrderForm.tsx` — removed token prop
- `src/frontend/src/components/ActiveOrdersTable.tsx` — removed token prop

### Tests (new)
- `src/tests/integration/test_auth.py` — 12 tests covering all auth endpoints
- `src/tests/fixtures/auth.py` — added auth_cookies, unverified_cookies fixtures

## Traceability R<n> → test

```
R1  ← test_login_valid_credentials
R2  ← test_login_invalid_credentials
R3  ← test_login_sends_otp
R4  ← test_otp_verify_correct
R5  ← test_otp_verify_wrong_code, test_otp_verify_expired
R6  ← test_me_with_valid_token
R7  ← test_me_no_token, test_me_unverified_token
R8  ← test_register_new_user
R9  ← test_register_duplicate_email
R10 ← /login page renders (frontend)
R11 ← valid login redirects to /verify-otp (frontend)
R12 ← correct OTP redirects to /dashboard (frontend)
R13 ← ProtectedRoute redirects unauthenticated to /login (frontend)
R14 ← test_logout_clears_cookie
```

## Test results

```
pytest tests/ -v --cov --cov-report=term-missing
```

All 20 tests passed (12 auth + 8 orders).

## Manual verification

- [ ] Start backend: `cd src && poetry run uvicorn backend.main:app --reload`
- [ ] Start frontend: `cd src/frontend && pnpm dev`
- [ ] Login flow: navigate to `/login`, enter admin@flayer.com / admin123, redirected to OTP page, check Mailpit for OTP, enter code, redirected to dashboard
- [ ] Logout clears cookie, dashboard inaccessible without auth

## Coverage

All backend auth code covered by integration tests. Frontend auth flow verified via TypeScript compilation.
