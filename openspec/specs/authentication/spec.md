# Authentication

## Purpose

Describe how callers prove identity to the API and how that identity is tied to Supabase Auth, so every protected operation can rely on a single token validation path.

## Requirements

### Requirement: The API MUST validate Supabase access tokens before handling protected routes

NestJS SHALL use a guard that reads the `Authorization: Bearer` token, calls Supabase `auth.getUser` with the project URL and anon key, and attaches `id`, `email`, and `accessToken` to the request for downstream use.

#### Scenario: Valid token

- **WHEN** a client sends a request with a valid `Authorization: Bearer <access_token>` header
- **THEN** the guard allows the request and the handler receives an authenticated user context

#### Scenario: Missing or invalid configuration

- **WHEN** `SUPABASE_URL` or `SUPABASE_ANON_KEY` is not set
- **THEN** the guard SHALL respond with 401 and a message that server auth is not configured

#### Scenario: Invalid or expired token

- **WHEN** Supabase returns an error or no user for the token
- **THEN** the guard SHALL respond with 401 and an invalid or expired token message
