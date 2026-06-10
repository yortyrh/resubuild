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

`apps/api` SHALL NOT expose `GET /auth/features` (or any equivalent runtime endpoint that returns the auth capability flags). The `AuthService.getFeatures()` method, the `AuthFeaturesDto`, and the `@Get('features')` controller route are all removed.

#### Scenario: The endpoint is not reachable

- **WHEN** a client GETs `GET /auth/features`
- **THEN** the API SHALL respond `404 Not Found`

### Requirement: The local env composer MUST mirror capability flags between api and web

`scripts/lib/local-env-composer.mjs` MUST keep the API and web `.env` files in sync with respect to the auth capability flags. On a re-run with a previous `apps/api/.env`, `AUTH_FORGOT_PASSWORD_ENABLED` MUST be preserved verbatim (or default to `false` on first run). OAuth-related env keys are not part of the composer surface.

#### Scenario: First run

- **WHEN** the operator runs `setup:env` for the first time (neither `apps/api/.env` nor `apps/web/.env` exists)
- **THEN** `AUTH_FORGOT_PASSWORD_ENABLED` SHALL be written to `apps/api/.env` as `false`
- **AND** the three `NEXT_PUBLIC_AUTH_*` keys SHALL be written to `apps/web/.env` as `false`

## MODIFIED Requirements

### Requirement: Forgot-password MUST be mirrored to the API for server-side enforcement

The API SHALL read only `AUTH_FORGOT_PASSWORD_ENABLED` in `apps/api/.env` as a server-side auth capability flag. It is consumed by `AuthConfigService` and gated through a server-side `ForgotPasswordEnabledGuard` on `POST /auth/forgot-password` and `POST /auth/reset-password`.

`NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` in `apps/web/.env` is a mirror of the API flag, used by the SPA to decide whether to render the "Forgot your password?" link. The two MUST agree at runtime; the `scripts/lib/local-env-composer.mjs` mirror logic writes the same value to both files when re-running `setup:env`. `AUTH_EMAIL_VERIFICATION_ENABLED` and `AUTH_PASSWORDLESS_ENABLED` are removed from `AuthConfigService`.

#### Scenario: Server-side flag enforced regardless of SPA

- **WHEN** the API operator sets `AUTH_FORGOT_PASSWORD_ENABLED=false`
- **THEN** `POST /auth/forgot-password` SHALL respond `404 Not Found` regardless of what the SPA believes
