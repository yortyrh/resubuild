# authentication

## REMOVED Requirements

### Requirement: The API MUST remove the custom GitHub OAuth callback

The `POST /auth/github/callback` endpoint and SPA GitHub PKCE completion flow are removed as part of dropping social OAuth entirely.

### Requirement: The API MUST expose Google OAuth support

Google OAuth configuration, `GET /auth/features` provider list, and "Continue with Google" UI are removed.

### Requirement: The API MUST expose GitHub OAuth authentication backed by Supabase Auth

`GET /auth/github` and all GitHub social-login surfaces are removed.

## ADDED Requirements

### Requirement: GitHub and Google OAuth MUST NOT be supported

The web SPA and Nest API SHALL NOT expose GitHub or Google social-login flows. `supabase/config.toml` SHALL NOT configure `[auth.external.github]` or `[auth.external.google]`. The SPA SHALL NOT render "Continue with GitHub" or "Continue with Google" buttons on `/login` or `/register`. The API SHALL NOT expose `GET /auth/github` or `POST /auth/github/callback`.

#### Scenario: OAuth endpoints are not reachable

- **WHEN** a client GETs `GET /auth/github` or POSTs to `POST /auth/github/callback`
- **THEN** the API SHALL respond `404 Not Found`

#### Scenario: Login page has no social buttons

- **WHEN** a user visits `/login`
- **THEN** the SPA SHALL NOT render GitHub or Google sign-in buttons

## MODIFIED Requirements

### Requirement: Confidential Supabase administrative credentials MUST remain confined to server processes

Neither `NEXT_PUBLIC_*` anon/publishable keys nor service-role secrets SHALL ship in browser bundles other than the publishable key explicitly intended for the Supabase client. The service-role key MUST remain in `apps/api/.env`. Browser bundles MAY carry the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars for auth flows only.

#### Scenario: Client bundle inspection excludes admin credentials

- **WHEN** a developer inspects emitted browser JavaScript bundles for authenticated pages
- **THEN** bundles MUST NOT statically embed Supabase service-role keys
- **AND** the Supabase publishable key MAY appear (it is intentionally public) but MUST NOT be paired with any DB-direct symbol from the cv-rest-api or database-cv-rls specs
