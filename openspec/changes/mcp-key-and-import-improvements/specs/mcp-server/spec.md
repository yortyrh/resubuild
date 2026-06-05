# MCP Server (delta)

## Purpose

This delta modifies the `mcp-server` capability to reflect changes already
implemented in the working tree. The schema, the upsert-based rotation, the
new `get_jsonresume_schema` tool, the export MIME-stripping behavior, and the
settings UI copy are all part of the same retroactive change set.

## ADDED Requirements

### Requirement: The MCP server SHALL expose `get_jsonresume_schema` as a read-only MCP tool

The MCP server SHALL register a tool named `get_jsonresume_schema` implemented
as a `@Tool({...})`-decorated method on an `@Injectable()` provider under
`apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts`. The tool SHALL
return an envelope `{ $id, version, schema }` where `schema` is the bundled
`packages/schemas/resume.schema.json` JSON document, `$id` is the schema's
`$id` (defaulting to `https://jsonresume.org/schema/` when absent), and
`version` is the schema's `meta.version` when present and `undefined`
otherwise. The tool SHALL be marked `readOnlyHint: true` and SHALL NOT make
any database, network, or auth-context call. The tool name SHALL appear in
`MCP_TOOL_NAMES` and the description SHALL appear in
`MCP_TOOL_DEFINITIONS.get_jsonresume_schema`.

#### Scenario: An MCP agent discovers the JSON Resume shape before composing a document

- **WHEN** an MCP client calls `tools/call` with `name: "get_jsonresume_schema"`
- **THEN** the response `structuredContent` is an object with keys `$id`, `version`, and `schema`
- **AND** `schema` is the bundled JSON Resume document (not a network-fetched copy)
- **AND** `schema.properties` includes the standard JSON Resume section keys (`basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects`, `meta`)
- **AND** `schema.definitions.iso8601` is present (referenced by date fields)

#### Scenario: The tool is read-only

- **WHEN** the MCP server is queried for the tool's annotations
- **THEN** `readOnlyHint` is `true`
- **AND** the tool makes no mutation to user state, the database, or storage

### Requirement: The MCP server SHALL upload exported artifacts with a bare MIME type while preserving the descriptive value on the row and the envelope

`ExportStorageService.uploadAndRegister` SHALL strip any `;`-delimited
parameters from the value passed to `supabase.storage.from(bucket).upload(...)`
(e.g. `application/json; charset=utf-8` becomes `application/json`) so the
`mcp-exports` bucket's `allowed_mime_types` allowlist in
`supabase/config.toml` accepts the call. The descriptive Content-Type value
supplied by the caller (with parameters) SHALL be preserved on the
`mcp_export` row and on the MCP signed-URL response envelope so downstream
consumers still get the charset hint.

#### Scenario: JSON export with a charset hint uploads successfully

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "application/json; charset=utf-8"`
- **THEN** `supabase.storage.from("mcp-exports").upload(...)` is called with `contentType: "application/json"`
- **AND** the `mcp_export` row's `content_type` column is `"application/json; charset=utf-8"`
- **AND** the signed-URL response envelope's `contentType` field is `"application/json; charset=utf-8"`

#### Scenario: HTML export with a charset hint uploads successfully

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "text/html; charset=utf-8"`
- **THEN** `supabase.storage.from("mcp-exports").upload(...)` is called with `contentType: "text/html"`
- **AND** the descriptive value is preserved on the row and the envelope

#### Scenario: Parameter-less content type is unchanged

- **WHEN** an MCP export tool calls `uploadAndRegister` with `contentType: "application/pdf"`
- **THEN** the value passed to `storage.upload(...)` is `"application/pdf"` (unchanged)
- **AND** the row's `content_type` column is `"application/pdf"`

### Requirement: The MCP server SHALL distinguish "Create API key" from "Rotate API key" in the settings UI

The web settings page at `/dashboard/settings/mcp` SHALL always expose a
button that triggers the key-creation flow. When the user has no key, the
button SHALL be labeled "Create API key" and SHALL use the default button
variant. When the user has a key, the button SHALL be labeled "Rotate key"
and SHALL use the outline button variant. The confirmation dialog SHALL
vary its title and description based on whether a key already exists, and
its primary action SHALL be destructive (`variant="destructive"`) when a
key exists and the default variant when it does not. The toast message and
the inline error message SHALL also vary based on the same condition.

#### Scenario: First-time user creates a key

- **WHEN** the user opens `/dashboard/settings/mcp` and no key exists
- **THEN** the button SHALL be labeled "Create API key"
- **AND** the dialog title SHALL be "Create API key?"
- **AND** the dialog description SHALL explain that a new key will be generated and that it will not be shown again
- **AND** the dialog's confirm button SHALL use the default (non-destructive) variant and be labeled "Create key"
- **AND** on success, the toast SHALL say "API key created. Copy the key — it will not be shown again."

#### Scenario: Existing user rotates a key

- **WHEN** the user opens `/dashboard/settings/mcp` and a key already exists
- **THEN** the button SHALL be labeled "Rotate key"
- **AND** the dialog title SHALL be "Rotate API key?"
- **AND** the dialog description SHALL explain that the current key will be immediately invalidated
- **AND** the dialog's confirm button SHALL use the destructive variant and be labeled "Rotate"
- **AND** on success, the toast SHALL say "Key rotated. Copy the new key — it will not be shown again."

## MODIFIED Requirements

### Requirement: The MCP server SHALL enforce "one active key per user" at the schema level

The table `public.mcp_api_key` SHALL enforce "at most one row per user" via
its primary key on `user_id` (a primary key is implicitly UNIQUE and NOT
NULL). The previous surrogate `id` UUID column and the previous `UNIQUE`
constraint on `user_id` are removed by the
`supabase/migrations/20260604190000_mcp_api_key_pk_user_id.sql` migration.
The MCP server's key-rotation flow SHALL issue a single atomic
`INSERT ... ON CONFLICT (user_id) DO UPDATE` (Supabase `upsert` with
`onConflict: 'user_id'`) and SHALL NOT perform a separate `DELETE` before
the insert. The `McpApiKeyRow` shape returned by the repository SHALL NOT
include a surrogate `id` field; the row's identifier is its `user_id`.

#### Scenario: A user rotates their MCP API key

- **WHEN** an authenticated user calls `POST /settings/mcp/keys` while a key already exists for their `user_id`
- **THEN** the repository SHALL call `supabase.from('mcp_api_key').upsert({ user_id, key_prefix, key_hash, encrypted_secret }, { onConflict: 'user_id' })` exactly once
- **AND** SHALL NOT call `delete` or `insert` on `mcp_api_key` before the upsert
- **AND** the returned row SHALL have `user_id` equal to the authenticated user's id and SHALL NOT have a surrogate `id` field
- **AND** the previous key's `key_hash` is replaced atomically (no row with the old `key_hash` survives the upsert)

#### Scenario: A user creates their first MCP API key

- **WHEN** an authenticated user calls `POST /settings/mcp/keys` while no key exists for their `user_id`
- **THEN** the repository SHALL call `upsert(...)` and the result SHALL be a single row keyed on `user_id`

#### Scenario: Concurrent rotate from a stale tab does not collide

- **WHEN** two tabs call `POST /settings/mcp/keys` for the same user within the same instant
- **THEN** both calls succeed; the final row reflects the second caller's values; no `BadRequestException` is surfaced for a unique-violation

### Requirement: The MCP server SHALL look up active keys and refresh `last_used_at` by `user_id`

`McpKeyRepository.findActiveKeyBySecret` SHALL return a row shaped as
`McpApiKeyRow` keyed by `user_id` (no surrogate `id`). `McpKeyRepository.touchLastUsedAt`
SHALL take a `userId: string` argument and SHALL update `mcp_api_key` rows
where `user_id = userId`. `McpApiKeyGuard` SHALL call
`touchLastUsedAt(row.user_id)` (not `touchLastUsedAt(row.id)`) after a
successful authentication.

#### Scenario: Guard refreshes `last_used_at` for the authenticated user

- **WHEN** `McpApiKeyGuard` authenticates a request and `findActiveKeyBySecret` returns a row
- **THEN** `touchLastUsedAt(row.user_id)` is called
- **AND** the `mcp_api_key` row for that user has its `last_used_at` column updated to the current timestamp
- **AND** the surrogate `id` field is not consulted (the table no longer has one)
