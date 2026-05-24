## ADDED Requirements

### Requirement: The API MUST expose primary user authentication lifecycle endpoints backed by Supabase Auth

`apps/api` SHALL expose HTTP endpoints implementing user registration with password, credential-based login, logout, JSON token renewal, and a session introspection resource so clients never call Supabase Auth SDKs directly. Responses **SHALL** carry access and refresh tokens (or equivalent explicit JSON fields) suitable for `Authorization: Bearer` on subsequent calls—**not** `Set-Cookie` for session establishment. Business rules (payload validation via DTOs, error mapping to stable HTTP statuses, auditing hooks for future observability, and rate limiting posture) reside solely in Nest services/controllers.

Nest SHALL enable **CORS** so a browser SPA on a **different origin** than the API may invoke auth and protected routes when that origin is allowlisted (for example via `CORS_ORIGIN`), exposing `Authorization` on preflight allow-headers as needed without requiring credentialed cookie requests.

Nest MAY use `@supabase/supabase-js` with server-only secrets (for example Supabase Auth Admin capabilities or authenticated REST exchanges) internally to synchronize users and mint Supabase-signed JWTs compliant with policies enforced by Postgres RLS expecting `auth.uid()`.

#### Scenario: Successful credential login returns API-defined credentials

- **WHEN** a client sends correct email and password credentials to `POST /auth/login` with content types accepted by the API
- **THEN** Nest SHALL authenticate against Supabase Auth server-side and respond with JSON-issued token material (access and refresh per contract) consistent with guarded CV routes validating Supabase-compliant JWT access tokens

#### Scenario: CORS preflight from an allowlisted web origin

- **WHEN** a browser on an origin allowlisted for the API sends a CORS preflight (`OPTIONS`) preceding `POST /auth/login`, `POST /auth/refresh`, or an authenticated request that includes `Authorization`
- **THEN** the API SHALL answer with successful preflight headers that permit the methods and request headers (including `Authorization` and `Content-Type`) required for those JSON auth flows

#### Scenario: Unknown email or incorrect password yields generic unauthorized response without enumeration

- **WHEN** a client submits invalid credentials at login
- **THEN** the API MUST respond `401 Unauthorized` with a deliberately non-enumerating error body

#### Scenario: Registration captures required fields safely

- **WHEN** a client submits valid signup fields to `POST /auth/register`
- **THEN** Nest SHALL persist the user identity through Supabase Auth server-side validation and MUST NOT echo secrets (passwords or service keys) back in responses or logs beyond structured redacted diagnostics

### Requirement: Confidential Supabase administrative credentials MUST remain confined to server processes

Neither `NEXT_PUBLIC_*` anon keys nor service-role-equivalent secrets required for signup/login delegation SHALL ship in `'use client'` bundles. Only Nest (and transitional Next.js purely server bundles if present during migration windows) MAY read values such as Supabase URLs, anon keys for server-only validation guards, or service-role keys guarded by infra secret stores.

#### Scenario: Client bundle inspection excludes admin credentials

- **WHEN** a developer inspects emitted browser JavaScript bundles for authenticated pages
- **THEN** bundles MUST NOT statically embed Supabase service-role keys nor reference environment variables gated for exposing Supabase anon keys purely for SPA convenience

