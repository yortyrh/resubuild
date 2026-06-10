# auth-passwordless

## MODIFIED Requirements

### Requirement: The API MUST expose an OTP send endpoint

`apps/api` SHALL expose `POST /auth/otp` (no auth required) gated behind `AUTH_PASSWORDLESS_ENABLED`. The body SHALL be `{ email: string, channel: 'email' }`. The server SHALL call `supabase.auth.signInWithOtp({ email, options: { channel: 'email' } })` and respond `200 { message: 'If the email is registered, a sign-in code has been sent.' }` regardless of whether the email is registered (enumeration-resistant).

The endpoint SHALL respond `404 Not Found` when `AUTH_PASSWORDLESS_ENABLED` is unset or `false`.

#### Scenario: Passwordless disabled

- **WHEN** `AUTH_PASSWORDLESS_ENABLED` is unset or `false`
- **THEN** `POST /auth/otp` SHALL respond `404 Not Found`
- **AND** `getAuthFeatures().passwordless` SHALL be `false` (resolved client-side from `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`)

### Requirement: The web SPA SHALL provide passwordless sign-in UI

The `/login` page SHALL render a tabbed or segmented control with password, OTP, and magic-link options when `getAuthFeatures().passwordless` is `true` (resolved client-side from `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`). UI gating SHALL NOT call `GET /auth/features`.

#### Scenario: Passwordless controls hidden when flag is off

- **WHEN** `getAuthFeatures().passwordless` is `false` (i.e. `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED` is not the literal string `true`)
- **THEN** the `/login` page SHALL render only the password form (no tabs)
