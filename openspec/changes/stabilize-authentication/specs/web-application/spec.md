# web-application

## MODIFIED Requirements

### Requirement: The web app MUST use backend-owned HTTP endpoints for authentication and authenticated Nest API access

Interactive client bundles (`'use client'` modules and hooks) MAY import `@supabase/supabase-js` **exclusively for authentication flows** (sign-in, sign-out, OAuth, OTP, magic link, email verification, session inspection). The Supabase client SHALL be initialised with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only. Direct database access, server-side secret access, and any symbol from `cv-rest-api` or `database-cv-rls` specs MUST remain server-side.

Session establishment, credential verification, logout, renewal, and user resolution for SPA purposes SHALL occur through either the Supabase client (preferred for the SPA) or documented HTTP endpoints on the Nest API origin identified by `NEXT_PUBLIC_API_URL`. The API origin **MAY differ** from the web origin; Nest **SHALL** enable **CORS** allowing the web origin and required methods and headers (including `Authorization` and `Content-Type`) for these calls. Next.js Route Handlers are **not required** for credential transport and SHOULD NOT duplicate auth business logic.

Authenticated requests to Nest CV endpoints SHALL send the short-lived **access token** from the Supabase client session in `Authorization: Bearer` (and **SHALL NOT** depend on browser cookies for establishing that identity). Refresh is handled automatically by the Supabase client through the publishable-key session; the API does not offer a server-side `POST /auth/refresh` endpoint.

#### Scenario: Cross-origin API access

- **WHEN** the web app is served from an origin different from `NEXT_PUBLIC_API_URL`
- **THEN** preflight and actual auth and CV requests MUST succeed when the browser origin is listed in the API's CORS allowlist and the client sends `Authorization` as required

#### Scenario: Supabase client refreshes the access token automatically

- **WHEN** the Supabase client session is nearing expiry
- **THEN** the client SHALL refresh the access token via the publishable-key session before the next `apiFetch`
- **AND** `apiFetch` SHALL read the (refreshed) access token from the Supabase client

#### Scenario: Authenticated API error handling

- **WHEN** the API returns a non-OK response
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present

#### Scenario: Client bundle has Supabase client but no DB-direct symbols

- **WHEN** a developer inspects the production web bundle
- **THEN** the auth chunk MAY import `@supabase/supabase-js` AND reference the publishable key
- **AND** MUST NOT import any symbol from `apps/api/src/cv/**` or `apps/api/src/database/**` and MUST NOT reference the Supabase service-role key
