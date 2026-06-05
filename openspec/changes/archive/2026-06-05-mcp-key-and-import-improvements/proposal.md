## Why

This change retroactively documents work already implemented in the working tree. It bundles four related improvements that landed together:

1. **MCP API key storage.** Previous schema had a surrogate `id` + `UNIQUE` on `user_id` and the app enforced "one key per user" via delete-then-insert, which had no `DELETE` policy (RLS-blocked) and a unique-violation race. Promoting `user_id` to the PK makes the invariant schema-level and lets the app rotate with one atomic upsert.
2. **JSON Resume shape for MCP agents.** Some LLM/MCP agents emit `{"item": [...]}` envelopes and non-array `basics.profiles`; the downstream AJV check rejects these silently. A new `get_jsonresume_schema` tool exposes the bundled schema; `prepareImportedResume` unwraps the envelope and coerces `basics.profiles`.
3. **MCP export signed URLs.** Callers pass descriptive `contentType` like `application/json; charset=utf-8`; the `allowed_mime_types` allowlist does an exact match on bare type/subtype, so the upload was rejected. `ExportStorageService` strips parameters before the upload and preserves the descriptive value on the row and envelope.
4. **Settings UI.** The MCP settings page now distinguishes "Create API key" from "Rotate API key" (button, dialog, toast, error, confirm variant). Settings cards switch from the generic Tailwind `border` to the `surface-soft` design token.

## What Changes

- Promote `user_id` to the primary key of `public.mcp_api_key` and add a user-scoped `DELETE` policy; the application rotates keys with a single `INSERT ... ON CONFLICT (user_id) DO UPDATE` (`upsert`).
- Add a new MCP tool `get_jsonresume_schema` that returns the bundled `packages/schemas/resume.schema.json` as a `{ $id, version, schema }` envelope (read-only).
- Make `prepareImportedResume` (in `@resumind/types`) recursively unwrap `{"item": ...}` envelopes on every JSON Resume document and coerce `basics.profiles` to an array of plain objects so agent-generated imports pass schema validation.
- Make `ExportStorageService.uploadAndRegister` strip MIME parameters (e.g. `; charset=utf-8`) from the value passed to `storage.upload(...)` while preserving the descriptive value on the `mcp_export` row and the signed-URL envelope.
- Update the MCP settings UI to label the action and dialog "Create API key" when no key exists and "Rotate API key" when one does; apply the project's `surface-soft` token to settings cards in the AI agent, MCP, and web-scrape settings pages.
- Keep `apps/api` Jest green by setting `apps/api/nest-cli.json` `compilerOptions.deleteOutDir = false` and `apps/api/tsconfig.json` `compilerOptions.rootDir = "./src"` so the `tsconfig.build.tsbuildinfo` cache file emitted during watch-mode rebuilds does not get cleared on every restart.

## Capabilities

### New Capabilities

- `mcp-jsonresume-schema-tool`: the new `get_jsonresume_schema` MCP tool (read-only) that exposes the bundled JSON Resume schema and tells agents to call it before composing a JSON Resume document from non-JSON Resume source material.

### Modified Capabilities

- `mcp-server`: REQUIREMENTS gain (a) a clause that `public.mcp_api_key.user_id` is the table's primary key so a single key per user is a schema invariant, (b) a clause that the key-rotation flow uses an atomic upsert keyed on `user_id` (no delete-then-insert, no application-layer invariant, no RLS gap), (c) a clause that a `DELETE` RLS policy exists so a user-scoped client can delete the previous row when the application uses a delete flow, (d) a clause that `ExportStorageService.uploadAndRegister` strips MIME parameters from the value sent to `storage.upload(...)` while preserving the descriptive value on the row and the envelope, and (e) a clause that the settings UI distinguishes "Create API key" from "Rotate API key" and the underlying action retains its destructive hint.
- `cv-json-import`: REQUIREMENTS gain a clause that `prepareImportedResume` recursively unwraps `{"item": ...}` envelopes anywhere in the document (top-level sections and nested arrays like `highlights` / `keywords` / `profiles`), and a clause that `basics.profiles` is coerced to an array of plain objects (a single object, a string URL, `null`, or missing all result in `[]`).
- `database-cv-rls`: REQUIREMENTS gain a clause that `public.mcp_api_key` allows the owning user to `DELETE` their own row (the new `mcp_api_key_delete` policy keyed on `auth.uid() = user_id`).
- `monorepo-and-toolchain`: REQUIREMENTS gain a clause that `apps/api` keeps `deleteOutDir: false` in `nest-cli.json` and a `rootDir: "./src"` in `tsconfig.json` so the watch-mode TypeScript build info cache survives restarts and does not trigger full rebuilds on every `nest start --watch` cycle. Existing CI/Lefthook rules are unchanged.

## Impact

- `apps/api/src/mcp/mcp-key.repository.ts` — `McpApiKeyRow` no longer carries `id`; `createKey` now uses `upsert(..., { onConflict: 'user_id' })`; `touchLastUsedAt(userId)` is keyed on `user_id` (not `id`).
- `apps/api/src/mcp/mcp-api-key.guard.ts` — calls `touchLastUsedAt(row.user_id)`.
- `apps/api/src/mcp/mcp.module.ts` — registers the new `GetJsonresumeSchemaTool` provider.
- `apps/api/src/mcp/tool-definitions.ts` — adds the `get_jsonresume_schema` entry to `MCP_TOOL_NAMES` and `MCP_TOOL_DEFINITIONS`.
- `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts` — new `@Tool`-decorated provider returning the bundled schema as a `{ $id, version, schema }` envelope.
- `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.spec.ts` — colocated unit tests.
- `apps/api/src/mcp/mcp-key.repository.spec.ts` — updated to assert the upsert flow and that `McpApiKeyRow` no longer has `id`.
- `apps/api/src/mcp/mcp-api-key.guard.spec.ts` and `apps/api/src/mcp/mcp-settings.service.spec.ts` — updated to drop `id` from `McpApiKeyRow` test fixtures and assert `touchLastUsedAt('u1')`.
- `apps/api/src/export-storage/export-storage.service.ts` — new `stripMimeParameters` helper and `uploadContentType` is passed to `storage.upload(...)`.
- `apps/api/src/export-storage/export-storage.service.spec.ts` — three new tests covering JSON, HTML, and parameter-less content types.
- `apps/api/nest-cli.json` — `deleteOutDir: false` (preserves `tsconfig.build.tsbuildinfo` between watch-mode restarts).
- `apps/api/tsconfig.json` — adds `"rootDir": "./src"`.
- `supabase/migrations/20260604180000_mcp_api_key_delete_policy.sql` — new `DELETE` RLS policy for the owning user.
- `supabase/migrations/20260604190000_mcp_api_key_pk_user_id.sql` — promotes `user_id` to the primary key.
- `apps/web/src/components/settings/ai-agent-settings.tsx` — settings card uses `surface-soft` and child list rows use `surface-soft`.
- `apps/web/src/components/settings/mcp-settings.tsx` — distinguishes Create vs Rotate in the button, dialog title, dialog description, and toast message; cards use `surface-soft`.
- `apps/web/src/components/settings/web-scrape-settings.tsx` — card uses `surface-soft`.
- `packages/types/src/prepare-imported-resume.ts` — new `unwrapJsonResumeWrappers` / `unwrapItemEnvelope` helpers, `defaultArraySection` accepts a single plain object, new `normalizeBasicsProfiles` helper, top-level normalization runs through the unwrap pass first.
- `packages/types/src/prepare-imported-resume.test.ts` — new `basics.profiles` and `{ item: ... }` unwrap test groups, plus the minimal-basics test updated to assert `profiles: []` is always present.

No public REST, MCP, JSON Resume schema, or Supabase storage contract changes. The MCP contract gains one new tool. The new `mcp_api_key` primary key is backward-compatible with the existing data because the previous schema already enforced a UNIQUE constraint on `user_id`; existing rows are rewritten as primary-key rows by the migration's `drop column id, add primary key (user_id)` step.
