# Authentication — Tasks

## Backend

- [x] Model: `otp_codes` table with SQLAlchemy model (R3, R4, R5)
- [x] Schema: `LoginRequest`, `OtpVerifyRequest`, `RegisterRequest`, `AuthResponse`, `UserResponse` (R1, R3, R4, R6, R8)
- [x] Endpoint: `POST /api/auth/login` — validate credentials, create OTP, send email, set JWT cookie (R1, R2)
- [x] Endpoint: `POST /api/auth/otp/send` — create and email OTP (R3)
- [x] Endpoint: `POST /api/auth/otp/verify` — verify OTP, update JWT cookie with otp_verified (R4, R5)
- [x] Endpoint: `GET /api/auth/me` — return user profile from cookie (R6, R7)
- [x] Endpoint: `POST /api/auth/register` — create new user (R8, R9)
- [x] Endpoint: `POST /api/auth/logout` — clear access_token cookie (R14)
- [x] Deps: add `get_verified_user` requiring `otp_verified=true` in JWT (R7)
- [x] Deps: update `get_current_user` to read JWT from cookie first, fallback to Bearer header (R7)

## Frontend

- [x] Auth context: `AuthProvider` with `login()`, `logout()`, `verifyOtp()`, uses cookie auth (R13, R14)
- [x] Auth API functions: `login()`, `verifyOtp()`, `fetchMe()`, `register()` — all with `credentials: "include"` (R1, R4, R6, R8)
- [x] Page: `/login` — email+password form, calls login API (R10, R11)
- [x] Page: `/verify-otp` — 6-digit code input, re-send button (R12)
- [x] Protected route wrapper: redirect to `/login` if not authenticated (R13)
- [x] Dashboard: replace manual token input with auth context, show user name, logout (R14)
- [x] Layout: integrate `AuthProvider` (R13)

## Tests

- [x] Test: login with valid credentials returns JWT (R1)
- [x] Test: login with invalid credentials returns 401 (R2)
- [x] Test: login auto-sends OTP and it's stored (R3)
- [x] Test: verify correct OTP returns updated JWT (R4)
- [x] Test: verify wrong OTP returns 401 (R5)
- [x] Test: verify expired OTP returns 401 (R5)
- [x] Test: GET /me with valid verified JWT returns user (R6)
- [x] Test: GET /me without token returns 401 (R7)
- [x] Test: GET /me with unverified JWT returns 401 (R7)
- [x] Test: register new user succeeds (R8)
- [x] Test: register duplicate email returns 422 (R9)
- [x] Test: logout clears the cookie (R14)

## Verification

- [x] All R1–R14 have a corresponding automated test
- [x] Manual: login flow works end-to-end (login → OTP email → verify → dashboard)
- [x] Manual: logout clears session, cannot access dashboard

## Traceability

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
R10 ← (manual/frontend) login page renders form
R11 ← (manual/frontend) valid login redirects to /verify-otp
R12 ← (manual/frontend) correct OTP redirects to /dashboard
R13 ← (manual/frontend) unauthenticated access to /dashboard redirects to /login
R14 ← test_logout_clears_cookie, (manual/frontend) logout clears session
```
