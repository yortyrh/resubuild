# auth-email-verification

## MODIFIED Requirements

### Requirement: Email verification MUST be governed by SPA and Supabase config

The email-verification flow MUST be governed by **two independent configuration points**:

1. `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/web/.env` — controls whether the SPA shows the check-email flow on signup.
2. `[auth.email].enable_confirmations` in `supabase/config.toml` — controls whether Supabase sends the confirmation email and gates session issuance on `signUp`.

The API no longer reads `AUTH_EMAIL_VERIFICATION_ENABLED`.

#### Scenario: Both knobs enabled

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` AND `[auth.email].enable_confirmations = true`
- **THEN** Supabase SHALL send a confirmation email on signup
- **AND** the SPA SHALL route unverified users to `/auth/check-email`

### Requirement: The API MUST expose an email verification status endpoint

`GET /auth/email-verified` is always reachable (not gated by a server-side flag). Whether the SPA polls it is governed by `getAuthFeatures().email_verification`.

#### Scenario: Verification token exchange, valid token

- **WHEN** a client GETs `GET /auth/email-verified?token=<valid>`
- **THEN** the API SHALL respond `200` with `{ verified: true, email: '<user.email>' }`

### Requirement: The web SPA SHALL route unverified users to a check-email page

The registration form redirects to `/auth/check-email` only when `getAuthFeatures().email_verification` is `true`.
