## 1. Update `openspec/config.yaml`

- [x] 1.1 In `openspec/config.yaml` `context` block, replace `Product: Resumind — monorepo for JSON Resume–based CVs ("Resumind").` with `Product: Resubuild — monorepo for JSON Resume–based CVs ("Resubuild").`

## 2. Update capability specs in `openspec/specs/*`

For each file below, apply **two mechanical substitutions in order**, then save:

1. Replace the brand: `Resumind` → `Resubuild` (word-boundary aware; preserves case).
2. Replace the package scope: `@resumind/` → `@resubuild/`.

Substitutions apply to `## Purpose`, `### Requirement:`, and `#### Scenario:` prose, plus list items and table cells. Do NOT touch fenced code blocks or inline backticks that reference real package names that the codebase does not yet have under the new brand.

- [x] 2.1 `openspec/specs/monorepo-and-toolchain/spec.md` — `## Purpose` sentence
- [x] 2.2 `openspec/specs/web-application/spec.md` — `## Purpose` sentence
- [x] 2.3 `openspec/specs/e2e-testing/spec.md` — `## Purpose` sentence
- [x] 2.4 `openspec/specs/mcp-server/spec.md` — narrative prose in `## Purpose` and `### Requirement:` blocks. **Hard constraint:** do NOT rename the `resumind://` URI templates or the `name = 'resumind'` MCP server identifier — they are part of the public MCP contract. Leave them verbatim.
- [x] 2.5 `openspec/specs/api-dev-debug-surface/spec.md` — scenarios in the "Node inspector" and "TypeScript source maps" requirements, plus the launch config and documentation requirements
- [x] 2.6 `openspec/specs/resume-schema-validation/spec.md` — the `### Requirement: The API MUST validate CV data with AJV against the shared JSON Schema` body (`@resumind/schemas` → `@resubuild/schemas`)
- [x] 2.7 `openspec/specs/cv-rest-api/spec.md` — the "Resumind-internal row `id` fields" sentence inside the JSON export scenario
- [x] 2.8 `openspec/specs/cv-json-import/spec.md` — `@resumind/types` → `@resubuild/types` and "Resumind meta" → "Resubuild meta" in the "normalize external JSON Resume documents before create" requirement
- [x] 2.9 `openspec/specs/cv-json-export/spec.md` — `@resumind/types` → `@resubuild/types` and "Resumind-internal `id` fields" → "Resubuild-internal `id` fields" in the "normalize assembled resumes for JSON export" requirement
- [x] 2.10 `openspec/specs/cv-editor-ui/spec.md` — `@resumind/types` → `@resubuild/types` in the "Date-primary section lists SHALL re-sort when dates change" requirement
- [x] 2.11 `openspec/specs/cv-normalized-schema/spec.md` — `@resumind/types` → `@resubuild/types` in the "Date-primary sections SHALL list by date attributes" requirement
- [x] 2.12 `openspec/specs/import-preview-ui/spec.md` — `@resumind/resume-template` → `@resubuild/resume-template` in the "Import flows SHALL expose a shared visual preview dialog" requirement
- [x] 2.13 `openspec/specs/cv-template-presentation/spec.md` — `@resumind/resume-template` → `@resubuild/resume-template` in the "persist per-CV template presentation settings" requirement

## 3. Update capability prose in `openspec/changes/**`

Apply the same two substitutions (`Resumind` → `Resubuild`, `@resumind/` → `@resubuild/`) to capability prose in every `proposal.md`, `design.md`, `tasks.md`, and `specs/**/*.md` file under `openspec/changes/archive/*/` and any active `openspec/changes/*/`.

**Hard constraints:**

- Do NOT rename inside fenced code blocks (e.g. ` ``` ` blocks that contain `pnpm --filter @resumind/api test -- --run` or similar). Those reference real scripts that still ship under the old names; renaming them in archive prose would create spec drift from the actual codebase.
- Do NOT rename the `resumind://` URI templates or `name = 'resumind'` MCP server identifier wherever they appear in archive `specs/mcp-server/spec.md` files. Those are public MCP contract strings.
- Skip the new `openspec/changes/rename-resumind-to-resubuild-in-openspec/{proposal.md,design.md,tasks.md}` — those are this change's own artifacts and intentionally reference the prior state.

Implementation hint: the rename is mechanical enough to script. A two-pass `ripgrep` + `sed` (or a small Node script run from the repo root) restricted to `openspec/changes/archive/**/*.md` is the recommended approach:

```bash
# Pass 1: brand noun
rg -l 'Resumind' openspec/changes/archive/ | xargs sed -i '' 's/Resumind/Resubuild/g'
# Pass 2: package scope
rg -l '@resumind/' openspec/changes/archive/ | xargs sed -i '' 's|@resumind/|@resubuild/|g'
```

After the bulk script, manually re-open each modified file and revert any unwanted renames inside fenced code blocks and any `resumind://` URI templates (use `git diff openspec/changes/archive/ | less` to scan).

- [x] 3.1 Run the two-pass substitution over `openspec/changes/archive/**/*.md`
- [x] 3.2 Manually revert unwanted renames inside fenced code blocks of the modified archive files (preserve `@resumind/api` / `@resumind/web` in `pnpm --filter @resumind/api test -- --run` and similar script invocations)
- [x] 3.3 Manually revert any `resumind://` URI templates or `name = 'resumind'` identifiers inside archive `specs/mcp-server/spec.md` files (public MCP contract strings)
- [x] 3.4 Apply the same two substitutions to the same paths under `openspec/changes/archive/*/specs/**/*.md` (delta specs archived under their parent change folder)
- [x] 3.5 If any active (non-archived) `openspec/changes/<name>/*.md` files exist at implementation time, apply the same substitution to their prose (no active changes at authoring time; re-check before implementation)

## 4. Validate, format, and lint

- [x] 4.1 Run `openspec validate rename-resumind-to-resubuild-in-openspec --strict` and resolve any errors
- [x] 4.2 Run `openspec validate` (project-wide) and confirm the rename produces no spec regressions outside this change
- [x] 4.3 Run `pnpm format` (Prettier) over all modified `.md` files
- [x] 4.4 Run `pnpm lint:fix` (Biome) over all modified `.md` files
- [x] 4.5 Run `pnpm --filter @resubuild/types test -- --run` and `pnpm --filter @resubuild/web test -- --run` — unit tests should remain green (no test code is touched by this change, but confirm no accidental breakage)
- [x] 4.6 Run `git diff --stat openspec/config.yaml openspec/specs/ openspec/changes/archive/` and confirm only the expected files were modified

## 5. Archive the change

- [ ] 5.1 Run `openspec archive rename-resumind-to-resubuild-in-openspec` to move the change into `openspec/changes/archive/`
- [ ] 5.2 Commit on a feature branch with title `docs(openspec): rename Resumind to Resubuild in openspec docs` and body describing the scope (config + specs + archive prose only; no code, no scripts, no env, no infra)
- [ ] 5.3 Open a PR and request review from the spec owner

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all 11 integration tests against the local Supabase stack (auth, CV CRUD, JSON import, JSON export, PDF export, image import, MCP `tools/list`, MCP `resources/list` regression scenarios, `MCP_SERVER_ENABLED=false` 404 behavior). This change is documentation-only; no API, DB, or runtime contract changes.

### Update required

- None — the rename is a word-level substitution in openspec docs only. The E2E spec file itself does not contain the literal brand "Resumind" or `@resumind/*` references that drive test scenarios (those reference real package names that still ship under the old brand until the parallel `archive/2026-06-06-rename-project-to-resubuild` change lands).

### Add

- None — no new E2E scenarios; this change is documentation-only.

## Out of scope (handled by other changes)

- Renaming the monorepo `name`, `package.json` `name` fields, or the `@resumind/*` package scopes in the actual `apps/*` and `packages/*` code. → handled by `openspec/changes/archive/2026-06-06-rename-project-to-resubuild/`.
- Renaming env vars (`RESUME_PARALLELISM` etc.), the `resumind://` MCP URI templates, the `name = 'resumind'` MCP server identifier, or the Supabase project id. → handled by `openspec/changes/archive/2026-06-06-rename-project-to-resubuild/`.
- Renaming strings inside `apps/*/src/`, `packages/*/src/`, `supabase/`, `.github/`, `README.md`, or any other non-openspec file. → out of scope; the openspec docs can lead the rename so the spec source of truth disagrees with the codebase for one PR cycle, then the parallel code rename catches up.
