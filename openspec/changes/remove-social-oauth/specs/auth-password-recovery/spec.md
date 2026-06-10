# auth-password-recovery

## MODIFIED Requirements

### Requirement: The API MUST expose a forgot-password endpoint

When `AUTH_FORGOT_PASSWORD_ENABLED` is unset or `false`, `POST /auth/forgot-password` SHALL respond `404 Not Found` AND `getAuthFeatures().forgot_password` SHALL be `false` (from `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`).

### Requirement: The web SPA SHALL expose forgot-password and reset-password pages

The `/forgot-password` page and `/login` "Forgot your password?" link are gated by `getAuthFeatures().forgot_password`, not `GET /auth/features`.

#### Scenario: Forgot password link is hidden when flag is off

- **WHEN** `getAuthFeatures().forgot_password` is `false`
- **THEN** the `/login` page SHALL NOT render the "Forgot your password?" link
