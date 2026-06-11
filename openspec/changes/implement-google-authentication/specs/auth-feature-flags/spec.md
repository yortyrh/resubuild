## ADDED Requirements

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
