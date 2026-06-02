## ADDED Requirements

### Requirement: Users SHALL opt in to MCP before keys authenticate

The system SHALL persist an `mcp_enabled` flag per user (default `false`). MCP authentication SHALL succeed only when `mcp_enabled` is true for the key owner. The web app and REST API SHALL expose endpoints for the authenticated user to read and update this flag.

#### Scenario: MCP disabled rejects valid key

- **WHEN** a client calls the MCP endpoint with a valid, non-revoked API key and `mcp_enabled` is false
- **THEN** the server SHALL respond with 403 and a message that MCP access is disabled

#### Scenario: User enables MCP in settings

- **WHEN** an authenticated user sets `mcp_enabled` to true via the settings API
- **THEN** subsequent MCP requests with a valid key SHALL be allowed (subject to other checks)

### Requirement: MCP API keys SHALL be stored hashed and shown only once at creation

The database SHALL provide `public.mcp_api_key` with columns including: `id` (uuid PK), `user_id` (FK to `auth.users`), `label` (text, nullable), `key_prefix` (text, not null), `key_hash` (text, not null), `created_at`, `last_used_at` (nullable), `revoked_at` (nullable). Plaintext keys MUST NOT be stored. RLS SHALL restrict rows to `auth.uid() = user_id` for JWT-authenticated management routes.

#### Scenario: Create key returns secret once

- **WHEN** an authenticated user creates an MCP key with optional label
- **THEN** the response SHALL include the full secret key exactly once
- **AND** subsequent list responses SHALL include only `id`, `label`, `key_prefix`, `created_at`, `last_used_at`, and revocation status

#### Scenario: List keys never exposes hash or secret

- **WHEN** an authenticated user lists MCP keys
- **THEN** each row SHALL omit `key_hash` and any recoverable secret material

### Requirement: Users SHALL manage MCP keys via JWT-protected REST endpoints

`apps/api` SHALL expose, behind `SupabaseAuthGuard`:

- `GET /settings/mcp` — `{ mcpEnabled, keys: [...] }` metadata
- `PATCH /settings/mcp` — toggle `mcpEnabled`
- `POST /settings/mcp/keys` — create key (body: optional `label`)
- `DELETE /settings/mcp/keys/:id` — revoke key (set `revoked_at`, idempotent)

Revoked keys MUST NOT authenticate MCP requests. A user SHALL have at most **two** active (non-revoked) keys at any time.

#### Scenario: Third active key rejected

- **WHEN** an authenticated user already has two non-revoked keys and calls `POST /settings/mcp/keys`
- **THEN** the API SHALL respond with **409 Conflict** and a message that the maximum of two keys is reached

#### Scenario: Revoked key fails MCP auth

- **WHEN** a client presents a bearer token matching a revoked key hash
- **THEN** the MCP guard SHALL respond with 401

#### Scenario: User revokes own key

- **WHEN** an authenticated user deletes a key id they own
- **THEN** that key SHALL no longer authenticate MCP requests
- **AND** the key SHALL disappear from active key lists

### Requirement: MCP API key authentication SHALL resolve a user context without Supabase JWT

A dedicated guard on the MCP route SHALL read `Authorization: Bearer <token>`, validate the token against stored hashes for non-revoked keys, verify `mcp_enabled`, attach `{ id: user_id }` to the request, and update `last_used_at` asynchronously.

#### Scenario: Valid MCP key

- **WHEN** a client sends a valid non-revoked MCP API key with MCP enabled for that user
- **THEN** the guard SHALL allow the MCP handler and attach the owning user id

#### Scenario: Missing bearer token

- **WHEN** a client calls the MCP endpoint without `Authorization: Bearer`
- **THEN** the response SHALL be 401

#### Scenario: Invalid key

- **WHEN** the bearer token does not match any active key hash
- **THEN** the response SHALL be 401 without revealing whether the prefix exists
