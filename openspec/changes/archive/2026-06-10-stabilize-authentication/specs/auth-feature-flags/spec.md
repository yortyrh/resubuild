# auth-feature-flags

## Purpose

Define the env-var contract and public endpoint that expose the opt-in authentication capabilities of Resumind so the API and the web SPA can render a consistent set of auth controls regardless of the deployment environment.

## ADDED Requirements

### Requirement: The API MUST expose a public features endpoint

`apps/api` SHALL expose `GET /auth/features` (no auth required) returning the set of authentication capabilities enabled in the current deployment. The response SHALL be JSON of the form:

```json
{
  "forgot_password": false,
  "email_verification": false,
  "passwordless": false,
  "providers": ["github", "google"]
}
```

The endpoint SHALL be reachable on the same CORS origin as the rest of the API (no `Authorization` header required, no cookie required).

#### Scenario: All three opt-in flows disabled

- **WHEN** the operator has not set any of `AUTH_FORGOT_PASSWORD_ENABLED`, `AUTH_EMAIL_VERIFICATION_ENABLED`, `AUTH_PASSWORDLESS_ENABLED`
- **THEN** `GET /auth/features` SHALL return all three flags as `false` and `providers` SHALL contain the OAuth providers currently enabled in Supabase (`github` and `google` when their `[auth.external.*]` blocks are enabled)

#### Scenario: Forgot password enabled

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED=true` in `apps/api/.env`
- **THEN** `GET /auth/features` SHALL return `forgot_password: true` AND `POST /auth/forgot-password` SHALL be reachable

#### Scenario: Email verification enabled

- **WHEN** `AUTH_EMAIL_VERIFICATION_ENABLED=true` AND `[auth.email].enable_confirmations = true` in `supabase/config.toml` (both must be set in sync; the spec does not auto-sync them)
- **THEN** `GET /auth/features` SHALL return `email_verification: true` AND `GET /auth/email-verified` SHALL be reachable

#### Scenario: Passwordless enabled

- **WHEN** `AUTH_PASSWORDLESS_ENABLED=true`
- **THEN** `GET /auth/features` SHALL return `passwordless: true` AND `POST /auth/otp` and `POST /auth/otp/verify` SHALL be reachable

#### Scenario: Disabled flow returns 404 from its endpoint

- **WHEN** a client calls an endpoint belonging to a disabled feature flag
- **THEN** the API SHALL respond `404 Not Found` so the SPA can treat a stale `GET /auth/features` response as authoritative

### Requirement: Feature flag env vars MUST be validated at boot

`apps/api` SHALL validate the three `AUTH_*_ENABLED` env vars through `AuthConfigService` (Zod) and SHALL fail boot with a clear message if any value is not a recognised boolean. Valid values: `true`, `false` (case-insensitive). Unrecognised values are coerced to `false` and the API continues to boot — a misconfigured deployment degrades safely to "no opt-in features" rather than refusing to start.

#### Scenario: Unrecognised flag value at boot

- **WHEN** the API starts with `AUTH_PASSWORDLESS_ENABLED=maybe`
- **THEN** `AuthConfigService` SHALL treat the value as `false` and the API SHALL continue to boot

### Requirement: The web SPA SHALL consume the features endpoint

The web SPA SHALL call `GET /auth/features` once on mount of the auth pages (`/login`, `/register`, `/auth/check-email`, `/forgot-password`, `/dashboard/settings/security`) and SHALL hide or render controls based on the response. The SPA SHALL revalidate the flags on each navigation to a guarded route so an operator's change takes effect without a rebuild.

#### Scenario: Forgot password link appears when flag is on

- **WHEN** `GET /auth/features` returns `forgot_password: true`
- **THEN** the "Forgot your password?" link SHALL appear beneath the password field on `/login`

#### Scenario: Stale flag is ignored

- **WHEN** the SPA cached a flag value but the server now reports the feature as disabled
- **THEN** clicking the cached button SHALL route to a 404 from the server and the SPA SHALL re-render the auth page without that control on next mount
