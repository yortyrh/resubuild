# auth-linkedin-oauth Specification

## Purpose

TBD - created by change implement-linkedin-login. Update Purpose after archive.

## Requirements

### Requirement: The web SPA MUST provide a LinkedIn sign-in button

The `/login` and `/register` pages SHALL render a "Continue with LinkedIn" button when `getAuthFeatures().linkedin_oauth` is `true`. The button SHALL call a single helper, `signInWithLinkedIn()`, in `apps/web/src/lib/auth/oauth.ts` (or co-located in the existing auth directory), which in turn calls `supabase.auth.signInWithOAuth({ provider: 'linkedin', options: { redirectTo: \`${APP_URL}/auth/callback\` } })`on the publishable-key Supabase client.`APP_URL`SHALL be derived from the existing public env var that already drives the magic-link`emailRedirectTo` value. The button SHALL be disabled while the call is in flight and SHALL surface a non-blocking error toast on failure.

The LinkedIn button SHALL render only when `getAuthFeatures().linkedin_oauth` is `true` (resolved client-side at build time from `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED` — only the literal string `true` enables it, matching the parsing rules in the `auth-feature-flags` spec). The button MUST NOT render when the flag is missing, empty, or any other value.

#### Scenario: User signs in with LinkedIn

- **WHEN** a user on `/login` clicks "Continue with LinkedIn" while `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED=true`
- **THEN** the SPA SHALL call `supabase.auth.signInWithOAuth({ provider: 'linkedin', options: { redirectTo: '<APP_URL>/auth/callback' } })`
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

### Requirement: The Supabase project MUST be configured to accept LinkedIn as an external provider

`supabase/config.toml` MUST contain an `[auth.external.linkedin]` block with `enabled = true` and `client_id` / `secret` values sourced from environment variables (`env(LINKEDIN_OAUTH_CLIENT_ID)` and `env(LINKEDIN_OAUTH_SECRET)`) — the secrets MUST NOT be hard-coded in the committed config. The existing `[auth].additional_redirect_urls` MUST already include `<APP_URL>/auth/callback`; no new entry is required for the LinkedIn flow.

The `scripts/lib/local-env-composer.mjs` MUST write stub values for `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to `supabase/.env` on first run so `supabase start` does not fail; the stubs MUST be clearly marked as non-functional (e.g. `linkedin-oauth-stub`).

#### Scenario: Local Supabase stack starts with the provider enabled

- **WHEN** the operator runs `supabase start` with the default `supabase/.env`
- **THEN** the CLI SHALL resolve the `env(...)` references from `supabase/.env`
- **AND** Supabase SHALL log that the LinkedIn provider is enabled (with the stub `client_id`)

#### Scenario: Operator supplies real LinkedIn OAuth credentials

- **WHEN** the operator sets `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` to real values in `supabase/.env` (or the cloud dashboard)
- **THEN** `signInWithOAuth({ provider: 'linkedin' })` from the SPA SHALL redirect to a live LinkedIn authorisation screen
- **AND** the resulting Supabase-issued JWT SHALL validate against the existing Bearer-token guard in `apps/api` without any code change on the API side

#### Scenario: Operator does not supply real credentials

- **WHEN** the operator leaves the stub `LINKEDIN_OAUTH_CLIENT_ID` and `LINKEDIN_OAUTH_SECRET` in place
- **THEN** the LinkedIn button MAY render (if `NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED=true`) but `signInWithOAuth` SHALL fail
- **AND** the SPA SHALL surface the "Sign-in failed" toast described above
- **AND** the API SHALL remain unaffected

### Requirement: The LinkedIn flow MUST produce a JWT that the existing API guard accepts without modification

`apps/api`'s `SupabaseAuthGuard` SHALL continue to validate the access token issued by the LinkedIn PKCE flow with no provider-specific code path. The guard already calls `supabase.auth.getUser` with the service-role key, which is provider-agnostic. The API SHALL NOT introduce a new endpoint, guard, or middleware specific to the LinkedIn provider.

#### Scenario: API call with a LinkedIn-issued access token

- **WHEN** the SPA stores a session obtained via the LinkedIn flow and sends `Authorization: Bearer <access_token>` to a guarded route (e.g. `GET /cv`)
- **THEN** the API SHALL validate the token and respond with the protected resource, identical to the password or magic-link flows
