## Context

This change retroactively documents four related improvements that landed together in the working tree. The shared context is "make the MCP server and the JSON Resume import path more robust to non-conformant agent output and to a multi-tab user".

### Pre-change state

- `public.mcp_api_key` had a surrogate `id` UUID column plus a `UNIQUE` constraint on `user_id`. The application enforced "one key per user" by deleting the previous row, then inserting the new one, all under the user-scoped client. There was no `DELETE` policy on the table, so a user-scoped `DELETE` was rejected by RLS — the rotate path was effectively "delete silently fails, then insert collides with the unique constraint, then we surface a `BadRequestException`". The `mcp_api_key_user_id_unique` constraint plus the missing DELETE policy made the rotate path fragile.
- `McpApiKeyRow` carried both `id` and `user_id`. The `McpApiKeyGuard` called `mcpKeyRepository.touchLastUsedAt(row.id)` (filtering by `id`). The repository's `createKey` issued a user-scoped `DELETE` followed by an `INSERT`.
- MCP agents (Cursor, Claude) calling `create_cv_from_jsonresume` and `replace_cv_from_jsonresume` did not have a way to introspect the JSON Resume schema before composing the document. The `@rekog/mcp-nest` tool descriptions referenced JSON Resume by name but the schema itself lived in `packages/schemas/resume.schema.json` and was only consumed by the API's runtime validation, not by tools.
- `prepareImportedResume` (in `packages/types/src/prepare-imported-resume.ts`) already handled missing array sections, reclassified volunteer work, and stripped foreign `$schema`/`meta`. It did not handle (a) `{"item": ...}` envelopes that some agents emit (mistakenly adopting an XML serialization habit) and (b) `basics.profiles` that came in as a single object, a string URL, or `null`. The downstream AJV schema check rejected these shapes silently, so the import was reported as "created" but no section landed in storage.
- `ExportStorageService.uploadAndRegister` passed `input.contentType` directly to `supabase.storage.from(bucket).upload(...)`. The `mcp-exports` bucket's `allowed_mime_types` in `supabase/config.toml` is `["application/pdf", "text/html", "image/png", "application/json"]` — bare types. When callers passed `application/json; charset=utf-8` (or any other descriptive value), the upload was rejected by the allowlist and the export was lost.
- The MCP settings UI labeled the action and dialog "Rotate API key" unconditionally. The button was hidden when no key existed, so a first-time user had to figure out the flow from outside the page. Cards in the settings pages used the generic Tailwind `border` token, which is lighter than the design-system `surface-soft` token used elsewhere on the dashboard.
- `apps/api/nest-cli.json` set `deleteOutDir: true`, which deletes `apps/api/dist/` and the `tsconfig.build.tsbuildinfo` cache file on every `nest start --watch` cycle. The cache file was being recreated on each restart, so the incremental-build optimization was effectively disabled. `apps/api/tsconfig.json` did not declare `rootDir`, so the build emitted an empty `dist/` path with the same name and the build's `tsbuildinfo` lived next to the entrypoint file.

## Goals / Non-Goals

**Goals:**

- Make "one active MCP API key per user" a schema-level invariant; eliminate the application-layer delete-then-insert that could leak unique-violation errors or race with concurrent tabs.
- Allow a user-scoped Supabase client to delete their own `mcp_api_key` row, so any future flow that needs to issue an explicit delete (or a defensive cleanup) is RLS-correct.
- Expose the bundled JSON Resume schema to MCP agents so they can call it before composing documents from non-JSON Resume source material (PDF text, DOCX text, OCR, scraped pages, free-form notes).
- Make `prepareImportedResume` robust to the two most common agent mistakes: the XML-style `{ item: [...] }` envelope and the non-array `basics.profiles`.
- Make `ExportStorageService.uploadAndRegister` pass the storage allowlist when callers supply descriptive Content-Type values, without losing the descriptive value for downstream consumers.
- Make the MCP settings UI's "first-time" vs "rotating" flows distinguishable from a button label, dialog title, dialog description, and toast message.
- Keep the `apps/api` watch-mode build fast by not deleting the `tsbuildinfo` cache on every restart and by setting a stable `rootDir` for the build output.

**Non-Goals:**

- No changes to public REST endpoints, MCP resource URIs, or any MCP tool other than the addition of one new tool (`get_jsonresume_schema`).
- No changes to JSON Resume schema content, Supabase storage contracts, or the storage bucket allowlist.
- No changes to production build behavior (`pnpm build`, `node dist/main`); the `nest-cli.json` and `tsconfig.json` tweaks are dev-time ergonomics.
- No changes to the public MCP client config snippet (Bearer key on the API host); the user-visible change is only "create" vs "rotate" copy.
- No new E2E scenarios for the schema tool, the unwrap pass, or the surface styling — they are covered by colocated unit tests.

## Decisions

### Decision 1: Promote `user_id` to the primary key of `mcp_api_key` (and drop the surrogate `id`)

The previous `id` UUID carried no information that `user_id` did not already carry: the row was always addressed by `user_id` in application code (e.g. `findActiveKeyBySecret` joins on `key_hash`, `createKey` filters on `user_id`, `findByUser` filters on `user_id`). The UNIQUE constraint on `user_id` was the only thing distinguishing rows, and that constraint is subsumed by a primary key. Promoting `user_id` to the primary key:

- Enforces the "one row per user" invariant at the schema level (a primary key is implicitly UNIQUE and NOT NULL).
- Lets the application rotate with a single `INSERT ... ON CONFLICT (user_id) DO UPDATE` (Supabase's `upsert(..., { onConflict: 'user_id' })`), which is atomic and does not depend on a separate delete.
- Lets the migration drop the `id` column without losing any semantic information. The migration is `drop constraint if exists mcp_api_key_user_id_unique; drop column id; add primary key (user_id);`. Existing rows are promoted in place: their `user_id` becomes the primary key.

**Alternatives considered:**

- Keep `id` as the PK and add a partial UNIQUE index on `user_id WHERE true` (i.e. still UNIQUE in practice) — rejected because it leaves the schema one indirection away from the actual invariant and `id` would never be used as the PK by application code.
- Keep the surrogate `id` and a UNIQUE on `user_id` but use a deferred constraint — rejected because deferring the constraint does not solve the "race between delete and insert" problem; only a single atomic upsert does.

### Decision 2: Add a user-scoped `DELETE` policy on `mcp_api_key`

The previous schema had no `DELETE` policy, so a user-scoped `DELETE` was rejected by RLS. The application did not need to delete (the upsert replaces the row), but a defensive cleanup path (or a future flow that needs an explicit delete) should not be RLS-blocked. The new policy is `create policy "Users can delete own mcp_api_key" on public.mcp_api_key for delete using (auth.uid() = user_id);`. The migration is additive and the e2e suite's MCP block (which only reads `/settings/mcp`) is unaffected.

**Alternatives considered:**

- Skip the policy because the application no longer needs it — rejected. Adding the policy is one migration line, costs nothing at runtime, and removes a footgun for any future code that does need to delete.
- Replace the upsert with an explicit delete + insert and rely on the new policy — rejected. The atomic upsert is simpler, faster, and avoids the brief "zero rows for this user" window.

### Decision 3: Add a new MCP tool `get_jsonresume_schema` (read-only)

MCP agents that import a non-JSON Resume source (PDF text, DOCX text, OCR, scraped websites, free-form notes) need to know the target shape before they compose a document. The existing tool descriptions referenced JSON Resume by name, but the schema itself was not exposed as a tool. Adding `get_jsonresume_schema`:

- Returns the bundled `packages/schemas/resume.schema.json` (no network access, no DB access, no auth context required).
- Wraps the schema in `{ $id, version, schema }` so the response carries the schema's identity and version alongside the document.
- Is marked `readOnlyHint: true` and `destructiveHint` is omitted (the default is `false`).
- Is implemented as a single `@Tool({ name, description, annotations })`-decorated method on a one-method provider under `apps/api/src/mcp/tools/cv/get-jsonresume-schema.tool.ts`, matching the existing `@rekog/mcp-nest` convention.

The schema is bundled into the build via the existing `nest-cli.json` `assets` entry (`../../packages/schemas/resume.schema.json` is copied into the dist alongside the API). The tool imports it via a relative path from the API source, and the build resolves it to the asset at runtime.

**Alternatives considered:**

- Expose the schema as an MCP resource (`resumind://schema/jsonresume`) — rejected. Resources are addressed by URI and require `resources/list` + `resources/read` round-trips; tools are simpler to call and the existing tool catalog is what agents discover first.
- Fetch the schema from a network endpoint at runtime — rejected. The schema is already bundled, the response is deterministic, and a network call would add latency and a failure mode for no benefit.

### Decision 4: Recursive `{ item: ... }` envelope unwrap in `prepareImportedResume`

Some MCP agents emit JSON Resume documents where every array (and a few single-object fields) is wrapped as `{"item": [...]}`, a side-effect of an XML-output habit. The shape is a valid JSON object, so the existing array checks (e.g. `Array.isArray(value)`) silently drop the section. The new pass:

- Is recursive: it walks the entire document, not just top-level sections. Nested arrays inside entry objects (`highlights`, `keywords`, `profiles`, etc.) get the same treatment.
- Is conservative: it only unwraps when the object has exactly one key and that key is `item`. A legitimate resume field that happens to be called `item` (e.g. `{ name: 'Acme', item: 'not-an-array' }`) is preserved.
- Runs once, up front, before the existing array-section defaulting. The downstream code can then assume a canonical JSON Resume shape.

The new `unwrapItemEnvelope(value)` helper unwraps a single `{ item: ... }` envelope, and the new `unwrapJsonResumeWrappers(value)` helper recurses through arrays and plain objects. The existing `defaultArraySection` was updated so a single plain object is coerced to a one-element array (e.g. `education: { institution: 'U' }` becomes `education: [{ institution: 'U' }]`).

**Alternatives considered:**

- Detect the envelope at the top level only — rejected. Real-world agent output (the bug report) wraps nested arrays too (`highlights: { item: [...] }`).
- Reject the document with an explicit error — rejected. The shape is recoverable, and the document is otherwise valid JSON Resume.
- Use a permissive AJV schema variant that accepts the envelope — rejected. The schema is downstream of `prepareImportedResume`; the cleanest fix is to normalize before validation.

### Decision 5: Coerce `basics.profiles` to an array of plain objects

The JSON Resume schema requires `basics.profiles` to be `type: array`. Agentic imports (PDF import, scrapers, copy-paste from a LinkedIn sidebar) frequently hand us a single object, a string URL, `null`, or nothing at all. The new `normalizeBasicsProfiles` helper:

- Passes an array through, filtering non-object entries (a string URL inside the array is dropped, not coerced).
- Coerces a single plain object to a one-element array.
- Defaults to `[]` for string, number, `null`, `undefined`, or missing values.

The minimal-basics test (`{ basics: { name: 'Alex' } }`) was updated to assert `profiles: []` is always present, because the new normalizer always sets it.

**Alternatives considered:**

- Drop the field when it is not an array — rejected. The schema declares the field, the UI expects it, and an empty array is more useful than a missing field.
- Throw an error on a non-array — rejected. Agents frequently hand us a single profile object (e.g. from a single linked social link on a scraped page); coercing it is the right call.

### Decision 6: Strip MIME parameters before `storage.upload`, preserve them on the row and envelope

Supabase Storage's `allowed_mime_types` does an exact string match against the `contentType` passed to `storage.upload(...)`. Callers (and our own internal helpers) sometimes pass descriptive values like `application/json; charset=utf-8` for the `mcp_export` row and the MCP response envelope. The new `stripMimeParameters` helper:

- Trims whitespace and slices at the first `;`, returning the bare `type/subtype`.
- Is called only for the value passed to `storage.upload(...)`. The descriptive value (`input.contentType`) is preserved on the `mcp_export` row and on the signed-URL response envelope, so downstream consumers still get the charset hint.

The three new tests cover JSON, HTML, and parameter-less content types. They assert (a) the value passed to `storage.upload` is the bare type, and (b) the value stored on the row matches the input.

**Alternatives considered:**

- Update the bucket's `allowed_mime_types` to include the descriptive values — rejected. The allowlist is the contract; a single migration that updates the allowlist would have to enumerate every descriptive variant (`application/json; charset=utf-8`, `text/html; charset=utf-8`, etc.) and would still leak the moment a new descriptive value is introduced.
- Pass the descriptive value to the storage upload and let the bucket allowlist accept it — rejected. The allowlist is the contract; the upload must match.
- Strip parameters at the caller (e.g. inside `McpExportService`) — rejected. Multiple callers (HTML export, JSON export, PDF export, screenshot export) all funnel through `ExportStorageService.uploadAndRegister`; the helper is the right place to enforce the contract once.

### Decision 7: Distinguish "Create API key" from "Rotate API key" in the MCP settings UI

The previous UI labeled the action and dialog "Rotate API key" unconditionally, and the button was hidden when no key existed. The new UI:

- Always shows the button. When no key exists, the button is labeled "Create API key" and uses the default variant. When a key exists, the button is labeled "Rotate key" and uses the outline variant (the destructive intent is in the confirm dialog's button).
- Uses a `hasKey` derived flag (`Boolean(settings?.key)`) to drive the button label, the dialog title, the dialog description, the toast message, the error message, and the confirm button variant.
- Preserves the destructive intent of the rotate flow: the confirm button is `variant="destructive"` when `hasKey` is true, and `variant="default"` when `hasKey` is false (a first-time create is not destructive — there is no key to invalidate).

**Alternatives considered:**

- Two separate dialogs (one for create, one for rotate) — rejected. The mechanics are identical (call `POST /settings/mcp/keys`, store the returned `result.key`, show the copy secret prompt), and the diverging copy is enough to differentiate the user intent.
- Auto-create a key on first settings visit — rejected. The user should opt in; auto-creating would leak an unused key into storage and the user might not realize they have one.

### Decision 8: Apply `surface-soft` to settings cards in the AI agent, MCP, and web-scrape settings pages

The settings cards in `apps/web/src/components/settings/{ai-agent,mcp,web-scrape}-settings.tsx` previously used the generic Tailwind `border` token. The project's design system has a `surface-soft` token (defined in `apps/web/src/app/globals.css`) that is the canonical muted surface treatment on the dashboard. Switching the cards and the inner list rows to `surface-soft` (and adding `text-card-foreground` so the foreground text reads correctly on the muted surface) brings the settings pages in line with the rest of the dashboard.

**Alternatives considered:**

- Update the design system to remove the `border` token — rejected. `border` is still used elsewhere; the change here is additive.
- Use a new `surface-card` token — rejected. The project already has `surface-soft`, and adding a new token for the same purpose is duplication.

### Decision 9: `nest-cli.json` `deleteOutDir: false` and `tsconfig.json` `rootDir: "./src"`

`apps/api/nest-cli.json` previously set `deleteOutDir: true`, which deleted `apps/api/dist/` and the `tsconfig.build.tsbuildinfo` cache on every `nest start --watch` cycle. The cache file was being recreated on every restart, so the incremental-build optimization was effectively disabled. Switching to `deleteOutDir: false` keeps the cache between restarts and makes watch-mode rebuilds faster.

`apps/api/tsconfig.json` did not declare `rootDir`, so the TypeScript build inferred it from the entrypoint file. Adding `"rootDir": "./src"` makes the build emit a stable output layout (e.g. `dist/main.js` always resolves to `src/main.ts`) and the `tsbuildinfo` cache file is no longer rewritten on every restart.

These two changes are dev-time ergonomics. The production build (`pnpm build`) emits the same output structure; only the cache file's location changes.

**Alternatives considered:**

- Remove `tsconfig.build.tsbuildinfo` from the file system entirely (e.g. add to `.gitignore` and rely on incremental rebuilds) — rejected. The cache file is what makes incremental rebuilds work; deleting it on every restart is the bug.
- Move the cache file to a `node_modules/.cache/` location — rejected. The default location is the project root next to the entrypoint, and changing it requires an extra option in `compilerOptions`.

## Risks / Trade-offs

- **MCP API key PK migration rewrites existing rows in place.** The migration `drop column id, add primary key (user_id)` is safe because the previous UNIQUE constraint on `user_id` guaranteed at most one row per user, and the application already addressed rows by `user_id`. No data is lost. The only change is that the row identifier becomes `user_id` instead of `id`. **Mitigation:** the migration is additive (drop the unique constraint first, then drop the column, then add the primary key) and the e2e suite's MCP block is unaffected because it only reads `/settings/mcp` and never inserts duplicate keys.
- **The new `get_jsonresume_schema` tool returns a large object.** The bundled schema is ~30 KB. The tool is read-only and is not on a hot path; the response is delivered over the existing streamable HTTP transport. **Mitigation:** the response is sent once per agent session, not per call; agents cache the schema on their side.
- **`unwrapItemEnvelope` could mask a legitimate "item" field.** A document where a top-level section is a plain object that happens to have an `item` key (e.g. `{ name: 'Acme', item: 'note' }`) is preserved — the heuristic only unwraps when the object has exactly one key and that key is `item`. **Mitigation:** a unit test (`does not unwrap objects that happen to have an "item" key but are not { item: [...] } wrappers`) covers this case.
- **`stripMimeParameters` is a private helper.** It is called from `uploadAndRegister` only; other upload paths (e.g. `media` bucket uploads in `MediaService`) are unchanged and still pass the descriptive value through. **Mitigation:** the `mcp-exports` bucket is the only bucket that uses a `contentType` allowlist; the `media` bucket does not. If a future bucket gains a similar allowlist, the helper can be extracted to a shared location.
- **`nest-cli.json` `deleteOutDir: false` means stale `dist/` files can survive.** A `tsc` rebuild does not delete files that are no longer referenced by the source tree. **Mitigation:** the production build (`pnpm build`) deletes `dist/` explicitly via Turborepo; only the watch-mode dev cycle keeps the cache.
- **The settings UI changes are additive** (button is always shown, dialog text varies). Users who have already used the rotate flow will see the new labels, but the underlying behavior is unchanged.

## Migration Plan

1. Land this change in a single PR. The migration order matters: deploy the `mcp_api_key_pk_user_id` migration before the application code that uses the upsert path. The migration is safe to apply in either order, but applying the migration first means the new code path is correct from the first deploy.
2. Verify locally: `pnpm supabase start`, `pnpm setup:env`, `pnpm samples:seed`, then `pnpm test:e2e -- --runInBand` (the e2e suite covers the MCP flow).
3. Roll back: revert the PR. The schema migration is reversible (`add column id, drop primary key, add unique constraint`); the application changes are isolated to `McpKeyRepository`, `McpApiKeyGuard`, the new tool, the import normalizer, the export service, and the settings UI.

## Open Questions

- None blocking. A follow-up could extract `stripMimeParameters` to a shared helper if a second bucket gains a content-type allowlist; for now it is private to `ExportStorageService`.
