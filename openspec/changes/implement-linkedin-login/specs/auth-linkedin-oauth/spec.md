# auth-linkedin-oauth Specification

## Purpose

TBD - created by change implement-linkedin-login. Update Purpose after archive.

## Requirements

### Requirement: The web SPA MUST provide a LinkedIn sign-in button

The `/login` and `/register` pages SHALL render a "Continue with LinkedIn" button when `getAuthFeatures().linkedin_oauth` is `true`. The button SHALL call a single helper, `signInWithLinkedIn()`, in `apps/web/src/lib/auth/oauth.ts` (or co-located in the existing auth directory), which in turn calls `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: `${APP_URL}/auth/callback` } })` on the publishable-key Supabase client. `APP_URL` SHALL be derived from the existing public env var that already drives the magic-link `emailRedirectTo` value. The button SHALL be disabled while the call is in flight and SHALL surface a non-blocking error toast on failure.

The LinkedIn button SHALL render only when `getAuthFeatures().linkedin_oauth` is `true` (resolved client-side at build time from `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED` — only the literal string `true` enables it, matching the parsing rules in the `auth-feature-flags` spec). The button MUST NOT render when the flag is missing, empty, or any other value.

#### Scenario: User signs in with LinkedIn

- **WHEN** a user on `/login` clicks "Continue with LinkedIn" while `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED=true`
- **THEN** the SPA SHALL call `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: '<APP_URL>/auth/callback' } })`
- **AND** the browser SHALL be redirected to LinkedIn for authorisation
- **AND** after LinkedIn authorises the app, the browser SHALL return to `<APP_URL>/auth/callback` with the Supabase-issued session

#### Scenario: LinkedIn button hidden when flag is off

- **WHEN** `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED` is unset, empty, or any value other than the literal string `true`
- **THEN** the `/login` and `/register` pages SHALL NOT render the "Continue with LinkedIn" button

#### Scenario: LinkedIn provider misconfigured in Supabase

- **WHEN** the user clicks "Continue with LinkedIn" and Supabase returns an error (e.g. provider not enabled at the Supabase project)
- **THEN** the SPA SHALL surface a non-blocking error toast with a generic "Sign-in failed" message
- **AND** SHALL NOT navigate the user away from `/login`

### Requirement: The SPA MUST complete the LinkedIn PKCE redirect via the existing `/auth/callback` page

The existing `/auth/callback` page SHALL handle the LinkedIn PKCE redirect by calling `supabase.auth.exchangeCodeForSession(code)` (or by relying on the Supabase client's automatic hash/query handling for `signInWithOAuth` returns) and SHALL then redirect the user to the post-login destination (the `?next=` query param if present, otherwise `/dashboard`). The callback page SHALL NOT branch on provider — the same code path handles the magic-link, GitHub, and LinkedIn redirects.

#### Scenario: LinkedIn returns to the callback with a valid code

- **WHEN** the browser navigates to `<APP_URL>/auth/callback` after LinkedIn authorises the app and a Supabase session is established
- **THEN** the SPA SHALL redirect to `/dashboard` (or to the `?next=` query param if present)
- **AND** the session SHALL be persisted via the same `apiFetch` path the magic-link flow already uses

#### Scenario: Callback is invoked without a code

- **WHEN** the user navigates to `<APP_URL>/auth/callback` with no `code` parameter
- **THEN** the SPA SHALL redirect to `/login?error=missing_code`
- **AND** the `/login` page SHALL render a non-blocking error explaining the sign-in could not be completed

### Requirement: The Supabase project MUST be configured to accept LinkedIn (OIDC) as an external provider

`supabase/config.toml` MUST contain an `[auth.external.linkedin_oidc]` block (NOT the deprecated `[auth.external.linkedin]` block) with `enabled = true` and `client_id` / `secret` values sourced from environment variables (`env(LINKEDIN_OAUTH_CLIENT_ID)` and `env(LINKEDIN_OAUTH_SECRET)`) — the secrets MUST NOT be hard-coded in the committed config. The existing `[auth].additional_redirect_urls` MUST already include `<APP_URL>/auth/callback`; no new entry is required for the LinkedIn flow.

The `scripts/lib/local-env-composer.mjs` MUST write stub values for `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to `supabase/.env` on first run so `supabase start` does not fail; the stubs MUST be clearly marked as non-functional (e.g. `linkedin-oauth-stub`).

The Supabase SDK call MUST use `provider: 'linkedin_oidc'` (the OpenID Connect provider released in `supabase-js@2.38.2+`), NOT the legacy `provider: 'linkedin'`. The legacy provider requests the deprecated `r_liteprofile` / `r_emailaddress` scopes that LinkedIn no longer authorises for OAuth apps created on or after 1 August 2023.

#### Scenario: Local Supabase stack starts with the provider enabled

- **WHEN** the operator runs `supabase start` with the default `supabase/.env`
- **THEN** the CLI SHALL resolve the `env(...)` references from `supabase/.env`
- **AND** Supabase SHALL log that the LinkedIn (OIDC) provider is enabled (with the stub `client_id`)

#### Scenario: Operator supplies real LinkedIn OAuth credentials

- **WHEN** the operator sets `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to real values in `supabase/.env` (or the cloud dashboard)
- **THEN** `signInWithOAuth({ provider: 'linkedin_oidc' })` from the SPA SHALL redirect to a live LinkedIn authorisation screen
- **AND** the resulting Supabase-issued JWT SHALL validate against the existing Bearer-token guard in `apps/api` without any code change on the API side

#### Scenario: Operator does not supply real credentials

- **WHEN** the operator leaves the stub `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` in place
- **THEN** the LinkedIn button MAY render (if `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED=true`) but `signInWithOAuth` SHALL fail
- **AND** the SPA SHALL surface the "Sign-in failed" toast described above
- **AND** the API SHALL remain unaffected

### Requirement: The LinkedIn OAuth app registered with the operator's Supabase project MUST have the OpenID Connect product enabled

The `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` values consumed by `[auth.external.linkedin_oidc]` in `supabase/config.toml` (and the equivalent keys configured in the Supabase Cloud dashboard for hosted projects) MUST come from a LinkedIn Developer application that has the **"Sign In with LinkedIn using OpenID Connect"** product added. The Supabase `linkedin_oidc` provider requests the `openid`, `profile`, and `email` scopes; LinkedIn's authorisation server rejects those scopes with `invalid_scope_error` (returned as `?error=invalid_scope_error&error_description=...` on the Supabase callback) when the underlying LinkedIn app is not enrolled in the OIDC product.

#### Scenario: Operator configures a fresh LinkedIn app for the first time

- **WHEN** the operator creates a new LinkedIn OAuth app to back the Supabase `linkedin_oidc` provider
- **THEN** the operator MUST open the LinkedIn Developer portal at https://www.linkedin.com/developers/apps, select the app, and on the **Products** tab click **Add product** next to **"Sign In with LinkedIn using OpenID Connect"** BEFORE the app can be used with Supabase
- **AND** the operator MUST wait for LinkedIn to confirm the product is active (usually immediate, but can take minutes for brand-new apps)

#### Scenario: Operator configures the OAuth redirect URLs on the LinkedIn app

- **WHEN** the operator configures the LinkedIn app's **Auth** tab
- **THEN** the operator MUST add the Supabase OAuth callback URL to the **Authorized redirect URLs for your app** list. For local dev this is `http://127.0.0.1:54321/auth/v1/callback` (or `http://localhost:54321/auth/v1/callback`); for hosted Supabase projects it is `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- **AND** the operator MUST copy the **Client ID** and **Primary Client Secret** from the **Auth** tab into `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` in `supabase/.env` (or the Supabase Cloud dashboard's **Authentication → Providers → LinkedIn (OIDC)** section for hosted projects)

#### Scenario: Operator clicks "Continue with LinkedIn" but the LinkedIn app is missing the OIDC product

- **WHEN** the LinkedIn app backing the Supabase provider does NOT have the **"Sign In with LinkedIn using OpenID Connect"** product enabled
- **THEN** LinkedIn's authorisation server SHALL redirect back to `<APP_URL>/login?error=invalid_scope_error&error_description=The+requested+permission+scope+is+not+valid`
- **AND** the `/login` page SHALL surface a non-blocking error message that includes the LinkedIn description
- **AND** the operator MUST enable the OIDC product on the LinkedIn app (see the prior scenario) to resolve the error — no code change is required

#### Scenario: Operator upgrades a pre-2023 LinkedIn app to the OIDC provider

- **WHEN** the operator has an existing LinkedIn OAuth app that was created before 1 August 2023 and uses the deprecated `r_liteprofile` / `r_emailaddress` scopes
- **THEN** the operator MUST add the **"Sign In with LinkedIn using OpenID Connect"** product to the existing app (LinkedIn allows this on legacy apps) OR create a new LinkedIn app enrolled in OIDC
- **AND** the operator MUST copy the new app's Client ID and Primary Client Secret into the Supabase-side env vars — the old app's credentials are NOT compatible with the `linkedin_oidc` provider

### Requirement: The LinkedIn flow MUST produce a JWT that the existing API guard accepts without modification

`apps/api`'s `SupabaseAuthGuard` SHALL continue to validate the access token issued by the LinkedIn PKCE flow with no provider-specific code path. The guard already calls `supabase.auth.getUser` with the service-role key, which is provider-agnostic. The API SHALL NOT introduce a new endpoint, guard, or middleware specific to the LinkedIn provider.

#### Scenario: API call with a LinkedIn-issued access token

- **WHEN** the SPA stores a session obtained via the LinkedIn flow and sends `Authorization: Bearer <access_token>` to a guarded route (e.g. `GET /cv`)
- **THEN** the API SHALL validate the token and respond with the protected resource, identical to the password or magic-link flows
