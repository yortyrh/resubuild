## 1. MCP API key storage (schema)

- [x] 1.1 Add `supabase/migrations/20260604180000_mcp_api_key_delete_policy.sql` with a user-scoped `DELETE` policy on `public.mcp_api_key` (auth.uid() = user_id)
- [x] 1.2 Add `supabase/migrations/20260604190000_mcp_api_key_pk_user_id.sql` that drops the previous `mcp_api_key_user_id_unique` constraint, drops the surrogate `id` column, and promotes `user_id` to the primary key
- [x] 1.3 Confirm the migration order in the filename (delete policy first, PK migration second) — applied in that order by `supabase db reset` and `supabase migration up`

## 2. MCP API key rotation (application)

- [x] 2.1 Update `apps/api/src/mcp/mcp-key.repository.ts`: drop `id` from `McpApiKeyRow`, replace the `delete` + `insert` in `createKey` with a single `upsert(..., { onConflict: 'user_id' })`, and rename `touchLastUsedAt(keyId)` to `touchLastUsedAt(userId)` filtering on `user_id`
- [x] 2.2 Update `apps/api/src/mcp/mcp-api-key.guard.ts` to call `touchLastUsedAt(row.user_id)` instead of `touchLastUsedAt(row.id)`
- [x] 2.3 Update `apps/api/src/mcp/mcp-key.repository.spec.ts` to assert the upsert flow (one upsert call, no delete, no insert), the absence of `id` in the returned row, and the `BadRequestException` surface path on upsert errors
- [x] 2.4 Update `apps/api/src/mcp/mcp-api-key.guard.spec.ts` and `apps/api/src/mcp/mcp-settings.service.spec.ts` to drop `id` from `McpApiKeyRow` test fixtures and assert `touchLastUsedAt('u1')`

## 3. `get_jsonresume_schema` MCP tool

- [x] 3.1 Create `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts` — `@Tool({ name: 'get_jsonresume_schema', description: MCP_TOOL_DEFINITIONS.get_jsonresume_schema.description, annotations: { readOnlyHint: true } })` returning `{ $id, version, schema }` from the bundled `packages/schemas/resume.schema.json`
- [x] 3.2 Add the `get_jsonresume_schema` entry to `MCP_TOOL_NAMES` and `MCP_TOOL_DEFINITIONS` in `apps/api/src/mcp/tool-definitions.ts`
- [x] 3.3 Register `GetJsonresumeSchemaTool` in `apps/api/src/mcp/mcp.module.ts` `toolProviders` (CV group)
- [x] 3.4 Add `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.spec.ts` (colocated) asserting the envelope shape, the section keys present in `schema.properties`, and the `iso8601` definition

## 4. MCP export MIME stripping

- [x] 4.1 Add a private `stripMimeParameters(contentType: string): string` helper in `apps/api/src/export-storage/export-storage.service.ts` that trims and slices at the first `;`
- [x] 4.2 In `uploadAndRegister`, compute `uploadContentType = stripMimeParameters(input.contentType)` and pass it to `supabase.storage.from(bucket).upload(...)` instead of `input.contentType` directly; preserve the descriptive value on the row and the envelope
- [x] 4.3 Add three new tests in `apps/api/src/export-storage/export-storage.service.spec.ts`: JSON with charset, HTML with charset, and parameter-less content type — each asserts the value passed to `storage.upload` and the value stored on the row

## 5. JSON Resume import normalization

- [x] 5.1 Add `unwrapItemEnvelope` and `unwrapJsonResumeWrappers` helpers in `packages/types/src/prepare-imported-resume.ts` that recursively unwrap `{"item": ...}` envelopes at every level
- [x] 5.2 Update `defaultArraySection` to coerce a single plain object to a one-element array (e.g. `education: { institution: "U" }` → `education: [{ institution: "U" }]`)
- [x] 5.3 Add `normalizeBasicsProfiles` helper that coerces `basics.profiles` to an array of plain objects (array passed through with non-object entries filtered, single object → one-element array, string/number/null/undefined/missing → `[]`)
- [x] 5.4 In `prepareImportedResume`, run the unwrap pass first (before array-section defaulting) and then apply `normalizeBasicsProfiles` to `result.basics.profiles`
- [x] 5.5 Add new test groups in `packages/types/src/prepare-imported-resume.test.ts`: `basics.profiles normalization` and `XML-style { item: [...] } wrapper unwrapping` — including a real-world document shape (full bug-report fixture) and a guard test that confirms a `work[].item` non-array field is NOT unwrapped
- [x] 5.6 Update the existing "minimal object" test to assert `basics.profiles` is always `[]`

## 6. Web settings UI

- [x] 6.1 In `apps/web/src/components/settings/mcp-settings.tsx`, derive `const hasKey = Boolean(settings?.key);` and use it to vary the button label, dialog title, dialog description, toast message, error message, and confirm button variant (destructive vs default)
- [x] 6.2 In `apps/web/src/components/settings/mcp-settings.tsx`, switch the three settings cards (Enable MCP, API key, Client configuration) and the inner "Your key" row from `rounded-lg border p-4` to `surface-soft text-card-foreground … p-4`
- [x] 6.3 In `apps/web/src/components/settings/ai-agent-settings.tsx`, switch the Accounts card and the inner account list rows from `rounded-lg border` to `surface-soft text-card-foreground`
- [x] 6.4 In `apps/web/src/components/settings/web-scrape-settings.tsx`, switch the Website import card from `rounded-lg border p-4` to `surface-soft text-card-foreground space-y-4 p-4`

## 7. API toolchain tweaks

- [x] 7.1 Set `apps/api/nest-cli.json` `compilerOptions.deleteOutDir = false` so the watch-mode build preserves `apps/api/dist/` and the `tsconfig.build.tsbuildinfo` cache
- [x] 7.2 Add `apps/api/tsconfig.json` `compilerOptions.rootDir = "./src"` so the build emits a stable output layout and the `tsbuildinfo` cache file is no longer rewritten on every restart

## 8. Verification

- [x] 8.1 Run `pnpm --filter @resumind/types test -- --run` — all unit tests pass, including the new `basics.profiles` and `{ item: ... }` unwrap test groups
- [x] 8.2 Run `pnpm --filter @resumind/api test -- --run` — all unit tests pass (the modified `mcp-key.repository.spec.ts`, `mcp-api-key.guard.spec.ts`, `mcp-settings.service.spec.ts`, the new `get-jsonresume-schema.tool.spec.ts`, and the updated `export-storage.service.spec.ts`)
- [x] 8.3 Run `pnpm typecheck` — typecheck passes with the new `GetJsonresumeSchemaTool` provider, the new `unwrapItemEnvelope` / `unwrapJsonResumeWrappers` / `normalizeBasicsProfiles` helpers, the `McpApiKeyRow` shape change, and the `rootDir` option
- [x] 8.4 Run `pnpm lint` and `pnpm format:check` — no Biome or Prettier diffs
- [x] 8.5 Manually apply the migrations against local Supabase (`supabase db reset`) and confirm the new PK and DELETE policy land correctly
- [x] 8.6 Run `pnpm build` — production build succeeds; `apps/api/dist/` includes the bundled `resume.schema.json` asset and the source maps

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — full suite. The MCP block reads `/settings/mcp` and never inserts duplicate keys, so promoting `user_id` to the primary key does not affect that path. The new `DELETE` policy and the upsert rotation are additive to RLS-correct behavior. The export MIME stripping is internal to `ExportStorageService` and does not change the MCP envelope contract. The JSON Resume import unwrap pass and `basics.profiles` normalization are internal to `prepareImportedResume` and do not change the public import contract. The settings UI copy and surface styling are additive and have no MCP/REST contract effect. Existing scenarios MUST continue to pass.

### Update required

- None — the public REST surface, MCP tool contract (other than the addition of one new tool), JSON Resume schema, Supabase storage contract, and the Supabase auth flow are unchanged.

### Add

- None — the new `get_jsonresume_schema` tool is covered by the colocated unit tests in `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.spec.ts`; the upsert rotation and `McpApiKeyRow` shape change are covered by the updated `mcp-key.repository.spec.ts`; the import unwrap pass and `basics.profiles` normalization are covered by the new test groups in `packages/types/src/prepare-imported-resume.test.ts`; the export MIME stripping is covered by the three new tests in `apps/api/src/export-storage/export-storage.service.spec.ts`; the settings UI copy and surface styling are visual-only and do not warrant E2E coverage.
