# auth-feature-flags Specification

## Purpose

Define how authentication capability flags (forgot-password, email-verification,
passwordless) are exposed to the web SPA, and which flags MUST additionally be
readable by the API for server-side enforcement.

The flags are build-time configuration (read from `process.env.NEXT_PUBLIC_*`
in the SPA) and are NOT fetched from a runtime endpoint. The previous
`GET /auth/features` round-trip was removed because it caused a layout shift
on the auth pages: the SPA had to wait for a network response before it could
decide which controls to render, and the resulting flicker on every page mount
was visible to operators and to end users on slow networks. Resolving the
flags at build time eliminates that round-trip entirely.

## Requirements

### Requirement: Auth feature flags MUST be resolved client-side at build time

The web SPA SHALL resolve the three authentication feature flags directly from
`process.env.NEXT_PUBLIC_*` environment variables, via
`apps/web/src/lib/auth/features.ts`. The three flags are:

- `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED`
- `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED`
- `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`

Each value is interpreted as a strict boolean: only the literal string `true`
enables the flag. Any other value (including the empty string, `1`, `yes`,
`TRUE` — case matters) is treated as `false`. A missing env var defaults to
`false`. This is enforced by `getAuthFeatures()` and covered by
`apps/web/src/lib/auth/features.test.ts`.

The resolved shape is:

```ts
type AuthFeatures = {
  forgot_password: boolean;
  email_verification: boolean;
  passwordless: boolean;
};
```

The SPA SHALL consume this via the `useAuthFeatures` React Query hook (or
the synchronous `getAuthFeatures()` for build-time / SSR contexts). Because
the value is a build-time constant, the hook SHALL use `staleTime: Infinity`
and SHALL NOT refetch at runtime.

#### Scenario: All three opt-in flows disabled

- **WHEN** none of the three `NEXT_PUBLIC_AUTH_*` flags are set to `true` in
  `apps/web/.env`
- **THEN** `getAuthFeatures()` SHALL return
  `{ forgot_password: false, email_verification: false, passwordless: false }`
- **AND** the SPA SHALL NOT render the "Forgot your password?" link, the
  passwordless tab group, or any signup-time email-verification routing

#### Scenario: Forgot password enabled

- **WHEN** `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED=true` in
  `apps/web/.env`
- **THEN** `getAuthFeatures().forgot_password` SHALL be `true`
- **AND** the SPA SHALL render the "Forgot your password?" link on `/login`
  AND the `/forgot-password` page SHALL be reachable

#### Scenario: Email verification enabled

- **WHEN** `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` in
  `apps/web/.env`
- **THEN** `getAuthFeatures().email_verification` SHALL be `true`
- **AND** the SPA SHALL route unverified signups to `/auth/check-email`

#### Scenario: Passwordless enabled

- **WHEN** `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED=true` in
  `apps/web/.env`
- **THEN** `getAuthFeatures().passwordless` SHALL be `true`
- **AND** the `/login` page SHALL render the "Email me a code" and
  "Email me a link" tabs

#### Scenario: Defensive parsing of non-`true` strings

- **WHEN** an env var is set to `1`, `yes`, `TRUE`, or any value other than
  the literal lowercase string `true`
- **THEN** `getAuthFeatures()` SHALL treat the value as `false` — the
  behaviour MUST be uniform across the three flags and covered by
  `features.test.ts`

### Requirement: Forgot-password MUST be mirrored to the API for server-side enforcement

The `AUTH_FORGOT_PASSWORD_ENABLED` value in `apps/api/.env` SHALL be the only capability
flag that the API still reads. It is consumed by `AuthConfigService` and
gated through a server-side `ForgotPasswordEnabledGuard` on
`POST /auth/forgot-password` and `POST /auth/reset-password` so a misconfigured
SPA cannot trigger recovery emails when the API operator has disabled the
flow.

`NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` in `apps/web/.env` is a
mirror of the API flag, used by the SPA to decide whether to render the
"Forgot your password?" link. The two MUST agree at runtime; the
`scripts/lib/local-env-composer.mjs` mirror logic writes the same value
to both files when re-running `setup:env`. A divergence is treated as a
deployment misconfiguration and is NOT validated at build time.

#### Scenario: API flag off, web flag on (misconfiguration)

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED` is `false` in `apps/api/.env` but
  `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` is `true` in `apps/web/.env`
- **THEN** the SPA SHALL render the "Forgot your password?" link AND
  `POST /auth/forgot-password` SHALL respond `404 Not Found` (the SPA
  treats the 404 as authoritative and re-hides the link on next mount)

#### Scenario: API flag on, web flag off (misconfiguration)

- **WHEN** `AUTH_FORGOT_PASSWORD_ENABLED` is `true` in `apps/api/.env` but
  `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` is `false` in `apps/web/.env`
- **THEN** the SPA SHALL NOT render the "Forgot your password?" link AND
  a direct navigation to `/forgot-password` SHALL render a "Not available"
  page (the recovery endpoint is reachable but the SPA UI to reach it is
  not)

#### Scenario: Server-side flag enforced regardless of SPA

- **WHEN** the API operator sets `AUTH_FORGOT_PASSWORD_ENABLED=false`
- **THEN** `POST /auth/forgot-password` SHALL respond `404 Not Found`
  regardless of what the SPA believes — the server-side `Guard` is the
  authoritative check

### Requirement: The API MUST NOT expose a features endpoint

`apps/api` SHALL NOT expose `GET /auth/features` (or any equivalent runtime
endpoint that returns the auth capability flags). The endpoint was removed
because:

1. It caused a layout shift on every auth-page mount: the SPA had to wait
   for a network response before deciding which controls to render.
2. The flags are build-time configuration; the SPA already knows the
   answer at compile time.
3. Operators flip the flags infrequently, so the staleness introduced by
   removing the round-trip (a redeploy is required to take effect) is
   acceptable and matches the existing model for `NEXT_PUBLIC_*` env vars.

The `AuthService.getFeatures()` method, the `AuthFeaturesDto`, and the
`@Get('features')` controller route are all removed. The remaining
`AuthConfigService` surface exposes only `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_ANON_KEY`, and `AUTH_FORGOT_PASSWORD_ENABLED` — the first two
are required for `AuthConfigService` to load, the last is consumed by the
`ForgotPasswordEnabledGuard`.

#### Scenario: The endpoint is not reachable

- **WHEN** a client GETs `GET /auth/features`
- **THEN** the API SHALL respond `404 Not Found`

#### Scenario: The endpoint does not appear in the OpenAPI surface

- **WHEN** the OpenAPI document is regenerated after a build
- **THEN** `/auth/features` SHALL NOT appear in the document

### Requirement: The local env composer MUST mirror capability flags between api and web

`scripts/lib/local-env-composer.mjs` MUST keep the API and web
`.env` files in sync with respect to the auth capability flags. On a
re-run with a previous `apps/api/.env`:

- `AUTH_FORGOT_PASSWORD_ENABLED` MUST be preserved verbatim (or default
  to `false` on first run) — this is `OPERATOR_CONTROLLED_KEYS` for the
  API.
- The three `NEXT_PUBLIC_*` mirror keys MUST be preserved verbatim (or
  default to `false` on first run) — this is `WEB_OPERATOR_CONTROLLED_KEYS`
  for the web.

The `setup:env` script MUST be re-runnable without silently changing any
of the three web mirrors — operator decisions on a given deployment MUST
survive a re-run of `setup:env`.

#### Scenario: First run

- **WHEN** the operator runs `setup:env` for the first time (neither
  `apps/api/.env` nor `apps/web/.env` exists)
- **THEN** `AUTH_FORGOT_PASSWORD_ENABLED` SHALL be written to
  `apps/api/.env` as `false`
- **AND** the three `NEXT_PUBLIC_AUTH_*` keys SHALL be written to
  `apps/web/.env` as `false`

#### Scenario: Re-run with operator overrides

- **WHEN** the operator has set `AUTH_FORGOT_PASSWORD_ENABLED=true` and
  `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=true` in the
  previous `apps/api/.env` and `apps/web/.env` respectively
- **AND** the operator runs `setup:env` again
- **THEN** both values SHALL survive the re-run verbatim — neither
  defaults to `false` nor is silently flipped

### Requirement: The production env schema MUST declare the web-mirror flags

`scripts/lib/env-prod-schema.mjs` MUST declare the three
`NEXT_PUBLIC_*` mirror keys in the `Web` group of the production
manifest schema, with descriptive help text that points operators to
`apps/web/src/lib/auth/features.ts`. The capability flags that moved to
the web side (`AUTH_EMAIL_VERIFICATION_ENABLED`,
`AUTH_PASSWORDLESS_ENABLED`) MUST be removed from the manifest schema's
`Auth` group, because the API no longer reads them.

#### Scenario: Manifest includes web mirrors

- **WHEN** the operator runs `setup:env:prod` to generate
  `.env.prod`
- **THEN** the generated file SHALL include all three
  `NEXT_PUBLIC_*` mirror keys (defaulted to `false` if the operator
  provides no value)
- **AND** the manifest SHALL NOT include
  `AUTH_EMAIL_VERIFICATION_ENABLED` or
  `AUTH_PASSWORDLESS_ENABLED` as required fields

### Requirement: The web SPA SHALL resolve a Google OAuth feature flag at build time

The `AuthFeatures` shape returned by `apps/web/src/lib/auth/features.ts` SHALL include a `google_oauth: boolean` field, resolved at build time from the `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` env var. The parsing rules SHALL match the existing four flags (forgot-password, email-verification, passwordless, github-oauth): only the literal lowercase string `true` enables the flag; any other value (`"false"`, the empty string, `"1"`, `"yes"`, `"TRUE"`, case-mismatched) coerces to `false`; a missing env var defaults to `false`. The behaviour MUST be covered by `apps/web/src/lib/auth/features.test.ts`.

The flag is web-only because the SPA's "Continue with Google" button is a build-time render decision — the Supabase-side `[auth.external.google]` block in `supabase/config.toml` is the actual provider gate. The operator is responsible for keeping the API flags in sync with their web mirrors; `scripts/setup-local-env.sh` and `scripts/setup-prod-env.mjs` copy the API values into the web mirror keys. No API-side mirror is required because the API exposes no Google-specific endpoint to gate.

#### Scenario: Google OAuth flag off by default

- **WHEN** `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is unset in `apps/web/.env`
- **THEN** `getAuthFeatures().google_oauth` SHALL be `false`
- **AND** the `/login` and `/register` pages SHALL NOT render the "Continue with Google" button

#### Scenario: Google OAuth flag opt-in

- **WHEN** `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED=true` in `apps/web/.env`
- **THEN** `getAuthFeatures().google_oauth` SHALL be `true`
- **AND** the `/login` and `/register` pages SHALL render the "Continue with Google" button (subject to provider liveness at the Supabase project)

#### Scenario: Defensive parsing of non-`true` strings for the Google flag

- **WHEN** `NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED` is set to `"false"`, `""`, `"1"`, `"TRUE"`, `"True"`, `" yes "`, `"on"`, or any value other than the literal lowercase string `true`
- **THEN** `getAuthFeatures().google_oauth` SHALL be `false`
- **AND** the behaviour MUST match the strict-`true` parsing of the four other auth feature flags, as covered by `features.test.ts`

#### Scenario: Complete AuthFeatures shape with Google included

- **WHEN** all five `NEXT_PUBLIC_AUTH_*` env vars are set to `"true"`
- **THEN** `getAuthFeatures()` SHALL return
  `{ forgot_password: true, email_verification: true, passwordless: true, github_oauth: true, google_oauth: true }`
- **AND** the `google_oauth` field SHALL be present on the returned object alongside the four existing fields
