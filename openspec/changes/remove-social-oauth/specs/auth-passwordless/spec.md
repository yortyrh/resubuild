# auth-passwordless

## MODIFIED Requirements

### Requirement: The API MUST expose an OTP send endpoint

When `AUTH_PASSWORDLESS_ENABLED` is unset or `false`, `POST /auth/otp` SHALL respond `404 Not Found` AND `getAuthFeatures().passwordless` SHALL be `false` (from `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`).

### Requirement: The web SPA SHALL expose passwordless sign-in controls

The passwordless tab group on `/login` renders only when `getAuthFeatures().passwordless` is `true`.

#### Scenario: Passwordless controls hidden when flag is off

- **WHEN** `getAuthFeatures().passwordless` is `false`
- **THEN** the `/login` page SHALL render only the password form (no tabs)
