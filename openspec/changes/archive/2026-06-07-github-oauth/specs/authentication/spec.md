# Authentication Delta Spec

## MODIFIED

### Requirement: The API MUST expose GitHub OAuth authentication backed by Supabase Auth

`apps/api` SHALL expose HTTP endpoints for GitHub OAuth flow. `GET /auth/github` returns a Supabase-generated OAuth URL. `POST /auth/github/callback` exchanges the authorization code for a session and returns standard token material. Clients redirect to the URL, then POST the code to the callback endpoint to obtain tokens.

The web SPA at `apps/web` SHALL implement the callback handler at `/auth/callback` to exchange the code and store the resulting session.

Supabase SHALL be configured with GitHub as an external OAuth provider in `supabase/config.toml` with `[auth.external.github]` enabled.

#### Scenario: Initiate GitHub OAuth flow

- **WHEN** a client calls `GET /auth/github`
- **THEN** Nest SHALL call `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: '<APP_URL>/auth/callback' } })` and return the URL

#### Scenario: Handle GitHub OAuth callback

- **WHEN** the web SPA POSTs the authorization code to `POST /auth/github/callback`
- **THEN** Nest SHALL call `supabase.auth.exchangeCodeForSession(code)` and respond with standard token material

#### Scenario: GitHub OAuth callback error

- **WHEN** Supabase returns an error during code exchange
- **THEN** the API MUST respond `401 Unauthorized` with a generic GitHub sign-in failure message
