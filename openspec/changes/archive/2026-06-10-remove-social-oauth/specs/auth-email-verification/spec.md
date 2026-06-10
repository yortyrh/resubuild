# auth-email-verification

## MODIFIED Requirements

### Requirement: Supabase email confirmation SHALL be controllable at deploy time

The email-verification flow MUST be governed by **two independent configuration points** that the operator is responsible for keeping in sync:

1. `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/web/.env` — controls whether the SPA shows the "check your email" flow on signup. This is the only auth capability flag for email verification; the API does not gate `GET /auth/email-verified` behind a server-side flag, and the previous `AUTH_EMAIL_VERIFICATION_ENABLED` env var was removed from `apps/api/.env` and `AuthConfigService`'s Zod schema.
2. `[auth.email].enable_confirmations` in `supabase/config.toml` — controls whether Supabase itself sends the confirmation email and gates session issuance on `signUp`.

This spec does **not** auto-sync the two values. The README MUST document the dependency and warn operators that flipping only one of them produces surprising behaviour.

#### Scenario: Both knobs enabled

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` AND `[auth.email].enable_confirmations = true` in `supabase/config.toml`
- **THEN** Supabase SHALL send a confirmation email on signup
- **AND** the SPA SHALL route unverified users to `/auth/check-email`

### Requirement: The API MUST expose an email verification status endpoint

`apps/api` SHALL expose `GET /auth/email-verified` (no auth required). The response SHALL be `{ verified: boolean, email: string | null }`. The endpoint SHALL accept an optional `?token=...` query parameter; when present, the server SHALL exchange the token via `supabase.auth.verifyOtp({ token, type: 'email' })` and return the resolved verification status. The endpoint is NOT gated behind a server-side flag — whether the SPA polls it is governed by `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/web/.env`.

#### Scenario: Verification token exchange, valid token

- **WHEN** a client GETs `GET /auth/email-verified?token=<valid>`
- **THEN** the API SHALL respond `200` with `{ verified: true, email: '<user.email>' }`

#### Scenario: Verification status, missing or invalid token

- **WHEN** a client GETs `GET /auth/email-verified` without a token
- **THEN** the API SHALL respond `200` with `{ verified: false, email: null }`

### Requirement: The web SPA SHALL route unverified users to a check-email page

The SPA SHALL add a `/auth/check-email` page. The registration form SHALL, on receiving a `signUp` response with no active session, redirect to `/auth/check-email` (only when `getAuthFeatures().email_verification` is `true`, i.e. `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` in `apps/web/.env`). The check-email page SHALL poll `GET /auth/email-verified?token=<token>` if a token is present in the URL hash, otherwise instruct the user to click the link in the email.

#### Scenario: New user is asked to verify their email

- **WHEN** a user signs up while `getAuthFeatures().email_verification` is `true` and the API returns no active session
- **THEN** the SPA SHALL redirect to `/auth/check-email`
- **AND** SHALL display "Check your email — we sent a confirmation link"
