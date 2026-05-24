# Web application (Next.js)

## Purpose

Capture how the Resumind frontend authenticates users, calls the API, and exposes CV editing flows aligned with the Nest API and Supabase session behavior.

## Requirements

### Requirement: The web app MUST use Supabase Auth for session and obtain API access tokens client-side

Authenticated pages SHALL use the browser Supabase client to resolve the current user and session, refresh the session when it is near expiry, and send `Authorization: Bearer` to the Nest API base URL from `NEXT_PUBLIC_API_URL` defaulting to `http://localhost:3001`.

#### Scenario: Proximity to session expiry

- **WHEN** the access token expires within about one minute
- **THEN** the client helper SHALL refresh the session before calling the API or surface a session expired error if refresh fails

#### Scenario: Authenticated API error handling

- **WHEN** the API returns a non-OK response
- **THEN** `apiFetch` SHALL surface a clear error string, including concatenated validation messages when present and a specific message for HTTP 409 concurrency conflicts

### Requirement: The SPA routes SHALL expose landing, auth, and dashboard CV workflows

The App Router under `src/app/` MUST provide public entry and auth pages (`/`, `/login`, `/register`), a dashboard shell, CV list, new CV (`/dashboard/cv/new`), and per-CV view/edit (`/dashboard/cv/[id]`) backed by shared CV UI components.

#### Scenario: User creates and edits a CV in the UI

- **WHEN** a signed-in user navigates dashboard flows
- **THEN** the UI SHALL load and save CVs through the typed client functions in `src/lib/api.ts` (`listCvs`, `getCv`, `createCv`, `updateCv`, `deleteCv`) matching the REST contract

### Requirement: Shared types and schema packages SHALL inform the client and server contract

The frontend and API both depend on workspace packages for resume typing and schema; changes to CV shape MUST flow through those packages to keep UI, API validation, and persistence aligned.

#### Scenario: Workspace alignment

- **WHEN** a developer changes resume structure
- **THEN** they SHALL update `packages/types` and/or `packages/schemas` and ensure both `apps/web` and `apps/api` still build and tests pass
