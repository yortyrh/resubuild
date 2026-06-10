# auth-email-verification Specification

## Purpose

TBD - created by archiving change stabilize-authentication. Update Purpose after archive.

## Requirements

### Requirement: Supabase email confirmation SHALL be controllable at deploy time

The email-verification flow MUST be governed by **two independent configuration points** that the operator is responsible for keeping in sync:

1. `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/web/.env` — controls whether the SPA shows the "check your email" flow on signup. This is the only auth capability flag for email verification; the API does not gate `GET /auth/email-verified` behind a server-side flag, and the previous `AUTH_EMAIL_VERIFICATION_ENABLED` env var was removed from `apps/api/.env` and `AuthConfigService`'s Zod schema.
2. `[auth.email].enable_confirmations` in `supabase/config.toml` — controls whether Supabase itself sends the confirmation email and gates session issuance on `signUp`.

This spec does **not** auto-sync the two values. The README MUST document the dependency and warn operators that flipping only one of them produces surprising behaviour (e.g. the API says the feature is on but Supabase never sends the email, or vice versa). The `apps/api` and `apps/web` config modules MUST NOT auto-write `[auth.email].enable_confirmations` from `AUTH_EMAIL_VERIFICATION_ENABLED`.

#### Scenario: Both knobs enabled

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` AND `[auth.email].enable_confirmations = true` in `supabase/config.toml`
- **THEN** Supabase SHALL send a confirmation email on signup
- **AND** the user's session returned by `signUp` SHALL have `email_confirmed_at: null` until they click the link
- **AND** the SPA SHALL route unverified users to `/auth/check-email`

#### Scenario: Both knobs disabled

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` is unset or `false` AND `[auth.email].enable_confirmations` is `false`
- **THEN** Supabase SHALL NOT send a confirmation email
- **AND** `signUp` SHALL return an active session immediately (existing behaviour)
- **AND** the SPA SHALL NOT route users to `/auth/check-email`

#### Scenario: Only the SPA flag is on (misconfiguration)

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` but `[auth.email].enable_confirmations` is `false` in `supabase/config.toml`
- **THEN** the SPA SHALL route new signups to `/auth/check-email`
- **AND** Supabase SHALL still return an active session immediately (because `enable_confirmations` is off) — the SPA SHALL still treat that session as verified for dashboard access, since `email_confirmed_at` is set at session creation when `enable_confirmations` is off
- **AND** the README SHALL warn the operator about this state

#### Scenario: Only the Supabase flag is on (misconfiguration)

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` is unset or `false` but `[auth.email].enable_confirmations = true`
- **THEN** Supabase SHALL send the confirmation email and `signUp` SHALL return no active session
- **AND** the SPA SHALL show the existing "Check your email" message that was already shown after registration, but SHALL NOT route to `/auth/check-email` and SHALL NOT poll the verification endpoint
- **AND** the README SHALL warn the operator about this state

### Requirement: The API MUST expose an email verification status endpoint

`apps/api` SHALL expose `GET /auth/email-verified` (no auth required). The
response SHALL be `{ verified: boolean, email: string | null }`. The
endpoint SHALL accept an optional `?token=...` query parameter; when
present, the server SHALL exchange the token via
`supabase.auth.verifyOtp({ token, type: 'email' })` and return the
resolved verification status. The endpoint is NOT gated behind a
server-side flag — whether the SPA polls it is governed by
`NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED` in `apps/web/.env`.

#### Scenario: Verification token exchange, valid token

- **WHEN** a client GETs `GET /auth/email-verified?token=<valid>`
- **THEN** the API SHALL respond `200` with `{ verified: true, email: '<user.email>' }`

#### Scenario: Verification status, missing or invalid token

- **WHEN** a client GETs `GET /auth/email-verified` without a token
- **THEN** the API SHALL respond `200` with `{ verified: false, email: null }`

### Requirement: The web SPA SHALL route unverified users to a check-email page

The SPA SHALL add a `/auth/check-email` page. The registration form SHALL, on receiving a `signUp` response with no active session, redirect to `/auth/check-email` (only when `getAuthFeatures().email_verification` is `true`, i.e. `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` in `apps/web/.env`). The check-email page SHALL poll `GET /auth/email-verified?token=<token>` if a token is present in the URL hash, otherwise instruct the user to click the link in the email.

The dashboard layout's `SessionGate` SHALL check `supabase.auth.getSession()` and, when `email_verification` is enabled and the user is signed in but `email_confirmed_at` is null, route the user back to `/auth/check-email` instead of the dashboard.

#### Scenario: New user is asked to verify their email

- **WHEN** a user signs up while `getAuthFeatures().email_verification` is `true` and the API returns no active session
- **THEN** the SPA SHALL redirect to `/auth/check-email`
- **AND** SHALL display "Check your email — we sent a confirmation link"

#### Scenario: User clicks the confirmation link

- **WHEN** a user clicks the link in the confirmation email
- **THEN** the SPA SHALL land on `/auth/check-email` (or `/dashboard` if the link includes a session) with the Supabase client session verified
- **AND** SHALL redirect to `/dashboard`

#### Scenario: Unverified user is blocked from dashboard

- **WHEN** an unverified user navigates to a `/dashboard/*` route while `getAuthFeatures().email_verification` is `true`
- **THEN** `SessionGate` SHALL redirect the user to `/auth/check-email` instead of rendering the dashboard
