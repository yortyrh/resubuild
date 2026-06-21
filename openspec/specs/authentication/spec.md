# Authentication

## Purpose

Describe how callers prove identity to the API and how that identity is tied to Supabase Auth, including lifecycle endpoints issued by Nest and Bearer validation on protected routes, so every protected operation can rely on a single token validation path.

## Requirements

### Requirement: The API MUST validate Supabase access tokens before handling protected routes

NestJS SHALL use a guard that reads the `Authorization: Bearer` token, calls Supabase `auth.getUser` with the project URL and service-role key, and attaches `id`, `email`, and `accessToken` to the request for downstream use. The service-role key is required so the guard can verify tokens issued by the publishable client.

#### Scenario: Valid token

- **WHEN** a client sends a request with a valid `Authorization: Bearer <access_token>` header
- **THEN** the guard allows the request and the handler receives an authenticated user context

#### Scenario: Missing or invalid configuration

- **WHEN** `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is not set
- **THEN** the guard SHALL respond with 401 and a message that server auth is not configured

#### Scenario: Invalid or expired token

- **WHEN** Supabase returns an error or no user for the token
- **THEN** the guard SHALL respond with 401 and an invalid or expired token message

### Requirement: The API MUST expose primary user authentication lifecycle endpoints backed by Supabase Auth

`apps/api` SHALL expose HTTP endpoints implementing user registration with password, credential-based login, JSON token renewal, and a session introspection resource. The SPA's primary path uses the Supabase client API for these flows; the server-side endpoints remain available for backward compatibility and for server-issued sessions (tests, scripts, future server-driven email links).

Responses **SHALL** carry access and refresh tokens (or equivalent explicit JSON fields) suitable for `Authorization: Bearer` on subsequent calls—**not** `Set-Cookie` for session establishment. Business rules (payload validation via DTOs, error mapping to stable HTTP statuses) reside solely in Nest services/controllers.

Nest SHALL enable **CORS** so a browser SPA on a **different origin** than the API may invoke auth and protected routes when that origin is allowlisted (for example via `CORS_ORIGIN`), exposing `Authorization` on preflight allow-headers as needed without requiring credentialed cookie requests.

#### Scenario: Successful credential login returns API-defined credentials

- **WHEN** a client sends correct email and password credentials to `POST /auth/login` with content types accepted by the API
- **THEN** Nest SHALL authenticate against Supabase Auth server-side and respond with JSON-issued token material (access and refresh per contract) consistent with guarded CV routes validating Supabase-compliant JWT access tokens

#### Scenario: CORS preflight from an allowlisted web origin

- **WHEN** a browser on an origin allowlisted for the API sends a CORS preflight (`OPTIONS`) preceding `POST /auth/login`, `POST /auth/register`, or an authenticated request that includes `Authorization`
- **THEN** the API SHALL answer with successful preflight headers that permit the methods and request headers (including `Authorization` and `Content-Type`) required for those JSON auth flows

#### Scenario: Unknown email or incorrect password yields generic unauthorized response without enumeration

- **WHEN** a client submits invalid credentials at login
- **THEN** the API MUST respond `401 Unauthorized` with a deliberately non-enumerating error body

#### Scenario: Registration captures required fields safely

- **WHEN** a client submits valid signup fields to `POST /auth/register`
- **THEN** Nest SHALL persist the user identity through Supabase Auth server-side validation and MUST NOT echo secrets (passwords or service keys) back in responses or logs beyond structured redacted diagnostics

### Requirement: Confidential Supabase administrative credentials MUST remain confined to server processes

Neither `NEXT_PUBLIC_*` anon/publishable keys nor service-role secrets SHALL ship in browser bundles other than the publishable key explicitly intended for the Supabase client. The service-role key MUST remain in `apps/api/.env`. Browser bundles MAY carry the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars for auth flows only.

#### Scenario: Client bundle inspection excludes admin credentials

- **WHEN** a developer inspects emitted browser JavaScript bundles for authenticated pages
- **THEN** bundles MUST NOT statically embed Supabase service-role keys
- **AND** the Supabase publishable key MAY appear (it is intentionally public) but MUST NOT be paired with any DB-direct symbol from the cv-rest-api or database-cv-rls specs

### Requirement: The API MUST expose a server-side logout that revokes refresh tokens

`POST /auth/logout` SHALL resolve the user from the Bearer token, then call `supabase.auth.admin.signOut(userId)` so all refresh tokens for the user are revoked server-side. The endpoint SHALL respond `204 No Content` on success and `401 Unauthorized` if the token is missing or invalid. The SPA SHALL additionally call `supabase.auth.signOut()` client-side to clear the local session.

#### Scenario: User signs out

- **WHEN** a signed-in client POSTs to `POST /auth/logout` with a valid Bearer token
- **THEN** the API SHALL call `supabase.auth.admin.signOut(userId)` and respond `204`
- **AND** the SPA SHALL call `supabase.auth.signOut()` and clear its stored session

#### Scenario: Stolen refresh token is unusable after sign-out

- **WHEN** an attacker presents a refresh token (stolen before sign-out) to Supabase's refresh endpoint after the legitimate user has signed out
- **THEN** Supabase SHALL reject the refresh (because `auth.admin.signOut` revoked the session family)
- **AND** the SPA SHALL treat the result as "session expired" and clear local session state

### Requirement: The API MUST use a single module-scoped Supabase client

`AuthModule` SHALL provide one `SupabaseClient` constructed at boot from `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (used for `auth.admin` operations). The legacy per-call `getBrowserClient` factory SHALL be removed. Service methods that need only user-scoped operations (sign-in, refresh) SHALL reuse the same client; the service-role key is required only for `auth.admin`.

#### Scenario: Service methods do not construct clients per call

- **WHEN** an auth endpoint is called
- **THEN** the service SHALL NOT call `createClient` during the request handler
- **AND** the same Supabase client instance SHALL be reused across requests

### Requirement: Session introspection MUST expose the authenticated user's profile picture URL

`GET /auth/me` SHALL return `user.picture` in addition to `id` and `email`. The value MUST be the authenticated user's profile picture URL string sourced from the Supabase user's `user_metadata.avatar_url` (falling back to `user_metadata.picture` when `avatar_url` is absent), or `null` when neither metadata key is present or non-empty. The field MUST be derived server-side from the validated session so the SPA does not need to reach into Supabase client metadata to render an avatar.

#### Scenario: Authenticated user with OAuth avatar metadata

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` includes a non-empty `avatar_url`
- **THEN** the response `user.picture` SHALL equal that `avatar_url` string

#### Scenario: Authenticated user with legacy `picture` metadata but no `avatar_url`

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` contains a non-empty `picture` but no `avatar_url`
- **THEN** the response `user.picture` SHALL equal that `picture` string

#### Scenario: Authenticated user without any avatar metadata

- **WHEN** a client sends a valid `Authorization: Bearer <access_token>` to `GET /auth/me`
- **AND** Supabase returns a user whose `user_metadata` contains neither `avatar_url` nor `picture` (or both are empty strings)
- **THEN** the response `user.picture` SHALL be `null`
