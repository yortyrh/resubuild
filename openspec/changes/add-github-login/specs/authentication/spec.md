## MODIFIED Requirements

### Requirement: The SPA MUST support password, passwordless, and GitHub OAuth sign-in flows; Google OAuth MUST NOT be supported

The web SPA SHALL offer the following sign-in entry points, each gated by a build-time feature flag resolved from `apps/web/src/lib/auth/features.ts`:

1. **Email + password** (always available) — the existing form posts to the legacy `POST /auth/login` and `POST /auth/register` endpoints (or the Supabase client direct method, whichever the implementation uses) and persists the session via the existing `apiFetch` path.
2. **Passwordless** (magic link / OTP, gated by `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED`) — the existing tabbed UI on `/login` that calls `POST /auth/otp` or `supabase.auth.signInWithOtp`.
3. **GitHub OAuth** (gated by `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED`) — a "Continue with GitHub" button that calls `supabase.auth.signInWithOAuth({ provider: 'github' })` and reuses the existing `/auth/callback` page. Full requirements, button placement, and provider configuration are defined in the `auth-github-oauth` spec.

**Google OAuth is explicitly not supported.** `supabase/config.toml` SHALL NOT configure `[auth.external.google]`. The SPA SHALL NOT render a "Continue with Google" button on `/login` or `/register`. The API SHALL NOT expose a `GET /auth/google` or `POST /auth/google/callback` endpoint.

#### Scenario: User signs in with email and password

- **WHEN** a user submits valid credentials on `/login`
- **THEN** the SPA SHALL persist the session via `apiFetch` AND redirect to `/dashboard`

#### Scenario: User signs in with a magic link or OTP

- **WHEN** a user completes the passwordless flow on `/login` (magic link or 6-digit OTP) and the Supabase client establishes a session
- **THEN** the SPA SHALL persist the session AND redirect to `/dashboard`

#### Scenario: User signs in with GitHub

- **WHEN** a user clicks "Continue with GitHub" on `/login` (or `/register`) and completes the GitHub authorisation
- **THEN** the SPA SHALL land on `/auth/callback` AND establish a Supabase session AND redirect to `/dashboard`
- **AND** the GitHub-issued JWT SHALL be accepted by the existing API guard without provider-specific code

#### Scenario: Google OAuth is not reachable

- **WHEN** a client GETs `GET /auth/google` or POSTs to `POST /auth/google/callback`
- **THEN** the API SHALL respond `404 Not Found`

#### Scenario: Login page has no Google sign-in button

- **WHEN** a user visits `/login`
- **THEN** the SPA SHALL NOT render a "Continue with Google" button
- **AND** SHALL render a "Continue with GitHub" button only when `getAuthFeatures().github_oauth` is `true`
- **AND** SHALL render the passwordless tab group only when `getAuthFeatures().passwordless` is `true`

## REMOVED Requirements

### Requirement: GitHub and Google OAuth MUST NOT be supported

**Reason**: This requirement has been split. The "Google OAuth MUST NOT be supported" half is preserved in the rewritten "The SPA MUST support password, passwordless, and GitHub OAuth sign-in flows" requirement above. The "GitHub OAuth MUST NOT be supported" half is replaced by the new `auth-github-oauth` spec, which now permits and constrains GitHub OAuth as a build-time-flagged sign-in option. The spec language "MUST NOT be supported" no longer reflects the product surface after the `add-github-login` change lands.
**Migration**: No migration is required at the application level. Operators who do not want GitHub OAuth in a given environment simply set `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=false` (or leave it unset) in `apps/web/.env`; the button does not render. The `supabase/config.toml` `[auth.external.github]` block is `enabled = true` regardless — operators who do not want the provider live in a given environment simply do not supply real `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET` to the Supabase project, and `signInWithOAuth` will fail closed with a "Sign-in failed" toast.
