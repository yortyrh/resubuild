# auth-password-recovery Specification

## Purpose

TBD - created by archiving change stabilize-authentication. Update Purpose after archive.

## Requirements

### Requirement: The API MUST expose a forgot-password endpoint

`apps/api` SHALL expose `POST /auth/forgot-password` (no auth required) gated behind the `AUTH_FORGOT_PASSWORD_ENABLED` feature flag. The body SHALL be `{ email: string }`. The server SHALL call `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<APP_URL>/reset-password' })`. The response SHALL be `200 OK` with `{ message: 'If the email is registered, a recovery link has been sent.' }` regardless of whether the email is registered (to prevent enumeration).

#### Scenario: Forgot password is enabled

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED=true` and a client POSTs an email to `POST /auth/forgot-password`
- **THEN** the API SHALL call `supabase.auth.resetPasswordForEmail` AND respond `200` with the generic message above

#### Scenario: Forgot password is disabled

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED` is unset or `false`
- **THEN** `POST /auth/forgot-password` SHALL respond `404 Not Found`
- **AND** `getAuthFeatures().forgot_password` SHALL be `false` (resolved
  client-side from `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`)

#### Scenario: Enumeration-resistant response

- **WHEN** a client POSTs an unknown email to `POST /auth/forgot-password`
- **THEN** the API SHALL respond `200` with the generic message (NOT a 404) so the client cannot enumerate registered emails

### Requirement: The API MUST expose a reset-password endpoint

`apps/api` SHALL expose `POST /auth/reset-password` (no auth required) gated behind `AUTH_FORGOT_PASSWORD_ENABLED`. The body SHALL be `{ access_token: string, refresh_token: string, new_password: string }`. The server SHALL create a one-off Supabase client with the user's recovery session, call `supabase.auth.updateUser({ password: new_password })`, and on success return `200 { updated: true }`. On weak password return `400` with the policy message. On any other error return `401`.

#### Scenario: Successful reset

- **WHEN** a client POSTs a valid recovery `access_token` / `refresh_token` pair and a strong new password to `POST /auth/reset-password`
- **THEN** the API SHALL respond `200 { updated: true }` AND the new password SHALL be usable on the next `POST /auth/login`

#### Scenario: Expired or invalid recovery token

- **WHEN** a client POSTs an expired or invalid recovery token to `POST /auth/reset-password`
- **THEN** the API SHALL respond `401` with the message `"Recovery link is invalid or has expired"`

### Requirement: The web SPA SHALL provide forgot and reset password pages

The SPA SHALL expose:

- `/forgot-password` (client page): collects an email, POSTs to `/auth/forgot-password`, shows the generic confirmation message. Hidden when `getAuthFeatures().forgot_password` is `false` (resolved client-side from `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`).
- `/reset-password` (client page): picks up the recovery session from the Supabase client (the user lands here by clicking the email link), prompts for a new password, and calls `supabase.auth.updateUser({ password })` directly. The Supabase client supplies the recovery session; the SPA never asks the user to paste a token.

The `/login` page SHALL render a "Forgot your password?" link when
`getAuthFeatures().forgot_password` is `true` (i.e.
`NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED=true`), linking to
`/forgot-password`.

#### Scenario: User requests a recovery email

- **WHEN** a user submits their email on `/forgot-password`
- **THEN** the SPA SHALL POST to `/auth/forgot-password` AND display the generic confirmation message

#### Scenario: User follows the email link

- **WHEN** a user clicks the recovery link in their email
- **THEN** the SPA SHALL land on `/reset-password` with an active Supabase recovery session
- **AND** SHALL display a "Choose a new password" form

#### Scenario: User submits a new password

- **WHEN** the user submits a strong new password on `/reset-password`
- **THEN** the SPA SHALL call `supabase.auth.updateUser({ password })` client-side
- **AND** on success SHALL redirect to `/login` with a success toast

#### Scenario: Forgot password link is hidden when flag is off

- **WHEN** `getAuthFeatures().forgot_password` is `false` (i.e.
  `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` is not the literal string
  `true`)
- **THEN** the `/login` page SHALL NOT render the "Forgot your password?" link
- **AND** direct navigation to `/forgot-password` SHALL render a "Not available" page (server-rendered 404-style message)
