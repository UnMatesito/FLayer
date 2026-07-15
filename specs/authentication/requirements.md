# Authentication — Requirements

R1. GIVEN a registered user with valid email and password
      WHEN they POST to /api/auth/login
      THEN they receive a JWT access token and user info
      AND the token expires after the configured JWT_EXPIRE_MINUTES

R2. GIVEN any user
      WHEN they POST to /api/auth/login with an incorrect email or password
      THEN they receive a 401 Unauthorized response
      AND no token is issued

R3. GIVEN an authenticated user with a valid JWT
      WHEN they POST to /api/auth/otp/send
      THEN a 6-digit OTP code is sent to the user's email
      AND the OTP is stored in otp_codes with a 10-minute expiry

R4. GIVEN an authenticated user who received an OTP
      WHEN they POST to /api/auth/otp/verify with the correct code
      THEN they receive a confirmation
      AND the OTP is marked as used

R5. GIVEN an authenticated user
      WHEN they POST to /api/auth/otp/verify with an incorrect or expired OTP
      THEN they receive a 401 Unauthorized response

R6. GIVEN a user with a valid JWT
      WHEN they GET /api/auth/me
      THEN they receive their user profile (id, email, name)

R7. GIVEN a request without a JWT or with an invalid/expired JWT
      WHEN accessing a protected endpoint
      THEN they receive a 401 Unauthorized response

R8. GIVEN an admin user
      WHEN they POST to /api/auth/register with email, name, and password
      THEN a new user is created with a hashed password
      AND the new user's profile is returned

R9. GIVEN an admin user
      WHEN they POST to /api/auth/register with an email that already exists
      THEN they receive a 422 response
      AND no user is created

R10. GIVEN a visitor to the frontend
      WHEN they navigate to /login
      THEN they see a login form with email and password fields

R11. GIVEN a user on the login page
      WHEN they submit valid credentials
      THEN they are redirected to the OTP verification page

R12. GIVEN a user on the OTP verification page
      WHEN they submit the correct code
      THEN they are redirected to the dashboard

R13. GIVEN an unauthenticated user
      WHEN they navigate to a protected route (/dashboard or /orders)
      THEN they are redirected to /login

R14. GIVEN an authenticated user
      WHEN they click "Cerrar sesión"
      THEN the JWT is cleared from the client
      AND they are redirected to /login
