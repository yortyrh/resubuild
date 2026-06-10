# auth-feature-flags

## REMOVED Requirements

### Requirement: The API MUST expose a public features endpoint

`GET /auth/features`, `AuthFeaturesDto`, `AuthService.getFeatures()`, and the `providers` array are removed.

## ADDED Requirements

### Requirement: Auth feature flags MUST be resolved client-side at build time

The web SPA SHALL resolve the three authentication feature flags directly from `process.env.NEXT_PUBLIC_*` environment variables, via `apps/web/src/lib/auth/features.ts`. The three flags are:

- `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`
- `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED`
- `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`

Each value is interpreted as a strict boolean: only the literal string `true` enables the flag. The resolved shape is `{ forgot_password, email_verification, passwordless }` with no `providers` field.

The SPA SHALL consume this via `useAuthFeatures` (or `getAuthFeatures()` synchronously) with `staleTime: Infinity` and no runtime refetch.

#### Scenario: All three opt-in flows disabled

- **WHEN** none of the three `NEXT_PUBLIC_AUTH_*` flags are set to `true` in `apps/web/.env`
- **THEN** `getAuthFeatures()` SHALL return all three flags as `false`
- **AND** the SPA SHALL NOT render forgot-password, passwordless, or email-verification controls

### Requirement: The API MUST NOT expose a features endpoint

`GET /auth/features` SHALL respond `404 Not Found`.

#### Scenario: The endpoint is not reachable

- **WHEN** a client GETs `GET /auth/features`
- **THEN** the API SHALL respond `404 Not Found`

### Requirement: The local env composer MUST mirror capability flags between api and web

`scripts/lib/local-env-composer.mjs` MUST mirror `AUTH_FORGOT_PASSWORD_ENABLED` to `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` on `setup:env` re-runs. OAuth-related env keys are not part of the composer surface.

## MODIFIED Requirements

### Requirement: Forgot-password MUST be mirrored to the API for server-side enforcement

Only `AUTH_FORGOT_PASSWORD_ENABLED` remains a server-read flag (via `ForgotPasswordEnabledGuard`). The SPA mirror is `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`. `AUTH_EMAIL_VERIFICATION_ENABLED` and `AUTH_PASSWORDLESS_ENABLED` are removed from `AuthConfigService`.
