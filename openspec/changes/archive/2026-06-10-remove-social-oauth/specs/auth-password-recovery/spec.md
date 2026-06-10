# auth-password-recovery

## MODIFIED Requirements

### Requirement: The API MUST expose a forgot-password endpoint

`apps/api` SHALL expose `POST /auth/forgot-password` (no auth required) gated behind the `AUTH_FORGOT_PASSWORD_ENABLED` feature flag. The body SHALL be `{ email: string }`. The server SHALL call `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<APP_URL>/reset-password' })`. The response SHALL be `200 OK` with `{ message: 'If the email is registered, a recovery link has been sent.' }` regardless of whether the email is registered (to prevent enumeration).

#### Scenario: Forgot password is disabled

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED` is unset or `false`
- **THEN** `POST /auth/forgot-password` SHALL respond `404 Not Found`
- **AND** `getAuthFeatures().forgot_password` SHALL be `false` (resolved client-side from `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`)

### Requirement: The web SPA SHALL provide forgot and reset password pages

The SPA SHALL expose `/forgot-password` and `/reset-password` pages. The `/login` page SHALL render a "Forgot your password?" link when `getAuthFeatures().forgot_password` is `true` (i.e. `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED=true`), linking to `/forgot-password`. UI gating SHALL use `getAuthFeatures()` instead of `GET /auth/features`.

#### Scenario: Forgot password link is hidden when flag is off

- **WHEN** `getAuthFeatures().forgot_password` is `false` (i.e. `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` is not the literal string `true`)
- **THEN** the `/login` page SHALL NOT render the "Forgot your password?" link
- **AND** direct navigation to `/forgot-password` SHALL render a "Not available" page
