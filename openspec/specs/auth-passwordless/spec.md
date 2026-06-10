# auth-passwordless Specification

## Purpose

TBD - created by archiving change stabilize-authentication. Update Purpose after archive.

## Requirements

### Requirement: The API MUST expose an OTP send endpoint

`apps/api` SHALL expose `POST /auth/otp` (no auth required) gated behind `AUTH_PASSWORDLESS_ENABLED`. The body SHALL be `{ email: string, channel: 'email' }`. The server SHALL call `supabase.auth.signInWithOtp({ email, options: { channel: 'email' } })` and respond `200 { message: 'If the email is registered, a sign-in code has been sent.' }` regardless of whether the email is registered (enumeration-resistant).

The endpoint SHALL respond `404 Not Found` when `AUTH_PASSWORDLESS_ENABLED` is unset or `false`.

#### Scenario: Passwordless enabled, OTP requested

- **WHEN** a client POSTs `{ email: '[email protected]', channel: 'email' }` to `POST /auth/otp` and `AUTH_PASSWORDLESS_ENABLED=true`
- **THEN** the API SHALL call `supabase.auth.signInWithOtp` AND respond `200` with the generic confirmation message

#### Scenario: Enumeration-resistant response

- **WHEN** a client POSTs an unknown email to `POST /auth/otp`
- **THEN** the API SHALL respond `200` with the same generic message (NOT a 404)

#### Scenario: Passwordless disabled

- **WHEN** `AUTH_PASSWORDLESS_ENABLED` is unset or `false`
- **THEN** `POST /auth/otp` SHALL respond `404 Not Found`
- **AND** `getAuthFeatures().passwordless` SHALL be `false` (resolved
  client-side from `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`)

### Requirement: The API MUST expose an OTP verify endpoint

`apps/api` SHALL expose `POST /auth/otp/verify` (no auth required) gated behind `AUTH_PASSWORDLESS_ENABLED`. The body SHALL be `{ email: string, code: string }`. The server SHALL call `supabase.auth.verifyOtp({ email, token: code, type: 'email' })` and, on success, return the standard `AuthTokenResponse`. On failure respond `401` with `"Invalid or expired code"`.

#### Scenario: Valid OTP

- **WHEN** a client POSTs `{ email, code }` with a valid OTP to `POST /auth/otp/verify` and `AUTH_PASSWORDLESS_ENABLED=true`
- **THEN** the API SHALL respond `200` with the standard `AuthTokenResponse`

#### Scenario: Invalid or expired OTP

- **WHEN** a client POSTs an invalid or expired code to `POST /auth/otp/verify`
- **THEN** the API SHALL respond `401` with the message `"Invalid or expired code"`

### Requirement: The web SPA SHALL provide passwordless sign-in UI

The `/login` page SHALL render a tabbed or segmented control with three options: "Password" (default), "Email me a code", "Email me a link". The "Email me a code" tab SHALL collect an email, call `POST /auth/otp`, then prompt for the 6-digit code and call `POST /auth/otp/verify`. The "Email me a link" tab SHALL call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<APP_URL>/auth/callback' } })` and instruct the user to click the link in their email. The SPA picks up the resulting session from the URL hash via the Supabase client.

The tab group SHALL render only when `getAuthFeatures().passwordless` is
`true` (resolved client-side from
`NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`).

#### Scenario: User signs in with an OTP code

- **WHEN** a user selects "Email me a code", enters their email, receives the code, and submits the 6 digits
- **THEN** the SPA SHALL POST to `/auth/otp/verify` AND on success persist the session via `apiFetch` and redirect to `/dashboard`

#### Scenario: User signs in with a magic link

- **WHEN** a user selects "Email me a link" and clicks the link in the email
- **THEN** the SPA SHALL land on `/auth/callback` with the Supabase client session already populated
- **AND** SHALL redirect to `/dashboard`

#### Scenario: Passwordless controls hidden when flag is off

- **WHEN** `getAuthFeatures().passwordless` is `false` (i.e.
  `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED` is not the literal string
  `true`)
- **THEN** the `/login` page SHALL render only the password form (no tabs)
