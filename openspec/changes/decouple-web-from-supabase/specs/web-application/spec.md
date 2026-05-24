## MODIFIED Requirements

### Requirement: The web app MUST use backend-owned HTTP endpoints for authentication and authenticated Nest API access

Interactive client bundles (`'use client'` modules and hooks) SHALL NOT import `@supabase/ssr`, `@supabase/supabase-js`, or environment variables scoped for Supabase browser clients for authentication. Session establishment, credential verification, logout, renewal, and user resolution for SPA purposes SHALL occur exclusively through documented HTTP endpoints on the Nest API origin identified by `NEXT_PUBLIC_API_URL`. The API origin **MAY differ** from the web origin; Nest **SHALL** enable **CORS** allowing the web origin and required methods and headers (including `Authorization` and `Content-Type`) for these calls. Next.js Route Handlers are **not required** for credential transport and SHOULD NOT duplicate auth business logic.

Authenticated requests to Nest CV endpoints SHALL send the short-lived **access token** from auth JSON responses in `Authorization: Bearer` (and **SHALL NOT** depend on browser cookies for establishing that identity). Refresh uses the documented JSON refresh contract (for example `POST /auth/refresh` with a refresh token from the client store), not `Set-Cookie`.

#### Scenario: Cross-origin API access

- **WHEN** the web app is served from an origin different from `NEXT_PUBLIC_API_URL`
- **THEN** preflight and actual auth and CV requests MUST succeed when the browser origin is listed in the API’s CORS allowlist and the client sends `Authorization` as required

#### Scenario: Proximity to access token expiry

- **WHEN** the client detects that the access credential is nearing expiry according to TTL rules agreed with `apps/api` (for example expiry within roughly one minute)
- **THEN** the client SHALL call the documented renewal endpoint before invoking other protected Nest operations, or SHALL surface session expired guidance if renewal fails or returns unauthorized

#### Scenario: Authenticated API error handling

- **WHEN** the API returns a non-OK response
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present and a specific message for HTTP 409 concurrency conflicts

