## 1. Package & workspace renames

- [ ] 1.1 Update root `package.json`: set `name` to `resubuild`; rewrite every `pnpm --filter @resumind/*` to `pnpm --filter @resubuild/*` (`dev:web`, `dev:api`, `dev:api:debug`, `dev:types`, `samples:pdf`, `import-models:sync`, `test:e2e`).
- [ ] 1.2 Update `apps/web/package.json`: `name` → `@resubuild/web`; rewrite all `@resumind/*` `dependencies` to `@resubuild/*`.
- [ ] 1.3 Update `apps/api/package.json`: `name` → `@resubuild/api`; rewrite all `@resumind/*` `dependencies` to `@resubuild/*`.
- [ ] 1.4 Update `apps/import-agent/package.json`: `name` → `@resubuild/import-agent`; rewrite all `@resumind/*` `dependencies` to `@resubuild/*`.
- [ ] 1.5 Update `packages/schemas/package.json`: `name` → `@resubuild/schemas`.
- [ ] 1.6 Update `packages/types/package.json`: `name` → `@resubuild/types`.
- [ ] 1.7 Update `packages/resume-template/package.json`: `name` → `@resubuild/resume-template`.
- [ ] 1.8 Update `packages/import-models/package.json`: `name` → `@resubuild/import-models`.

## 2. Import-path & internal-string rewrites

- [ ] 2.1 In every workspace `src/**/*.{ts,tsx,mts,cts}`, replace `@resumind/...` import specifiers with `@resubuild/...`.
- [ ] 2.2 In every workspace `test/**/*.{ts,tsx,mts,cts}`, replace `@resumind/...` import specifiers with `@resubuild/...`.
- [ ] 2.3 In `apps/api/src/mcp/**`, update the MCP server name/identifier (e.g. `resumind-mcp` → `resubuild-mcp`) and any hard-coded brand strings surfaced in MCP tool descriptions or resources.
- [ ] 2.4 In `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth-session.ts`, and any other file that references the old env var prefix, rename `RESUMIND_*` → `RESUBUILD_*`.
- [ ] 2.5 In `.vscode/launch.json` and any other dev-tooling config that references the old package scope, rename `@resumind/*` → `@resubuild/*`.

## 3. Supabase project identifier

- [ ] 3.1 In `supabase/config.toml`, change `project_id = "resumind"` to `project_id = "resubuild"`.
- [ ] 3.2 In `scripts/setup-local-env.sh` (and any env template), update the default `project_id` reference and any `RESUMIND_*` placeholder keys to `RESUBUILD_*`.
- [ ] 3.3 In `supabase/migrations/20260528140000_cv_template_id.sql` (and any other migration that references the old project/identifier), update only brand-derived identifiers; do NOT change the SQL schema.

## 4. Docs, fixtures, and OpenSpec prose

- [ ] 4.1 In `README.md`, replace the "Resumind" brand references with "Resubuild" in headings, intro copy, and any `pnpm --filter` snippets.
- [ ] 4.2 In `.cursor/agents/README.md`, rename brand references and any old workspace scope references.
- [ ] 4.3 In `.samples/e2e-fixture.json` and other committed fixtures, update any brand-derived strings (e.g. display name, MCP server name); keep UUIDs and CV data unchanged.
- [ ] 4.4 In `apps/api/README.md`, rename brand references.
- [ ] 4.5 In `scripts/generate-sample-pdfs.mjs` and any other root script, update brand-derived strings.

## 5. Lockfile & verify

- [ ] 5.1 From repo root, run `pnpm install` to regenerate `pnpm-lock.yaml` with the new package names.
- [ ] 5.2 Run `pnpm format` then `pnpm lint:fix` to apply Prettier/Biome cleanups to renamed files.
- [ ] 5.3 Run `pnpm typecheck` and confirm zero errors.
- [ ] 5.4 Run `pnpm test` (unit) and confirm all unit tests pass.
- [ ] 5.5 Run `pnpm build` and confirm all workspaces build.
- [ ] 5.6 Run `pnpm verify` and confirm the full pipeline passes.

## 6. Local Supabase re-bootstrap & e2e regression

- [ ] 6.1 Stop the local Supabase stack and wipe the local volume: `supabase stop --no-backup` (or `docker compose down -v` in the supabase compose directory) so containers/volumes named after the old `project_id` are removed.
- [ ] 6.2 Run `supabase start` so the local stack comes up under the new `project_id = "resubuild"`.
- [ ] 6.3 Run `pnpm setup:env` and confirm the generated `apps/api/.env` and `apps/web/.env` use `RESUBUILD_*` keys.
- [ ] 6.4 Run `pnpm samples:seed` and confirm `.samples/e2e-fixture.state.json` and `.samples/local-credentials.json` are created against the renamed project.
- [ ] 6.5 Run `pnpm test:e2e` and confirm all e2e specs in `apps/api/test/e2e/*.e2e-spec.ts` pass against the renamed local Supabase.

## 7. Final brand-leak sweep

- [ ] 7.1 Run `rg -i "resumind" --hidden -g '!node_modules' -g '!openspec/changes/archive' -g '!pnpm-lock.yaml' -g '!.git'` and confirm only the archive and lockfile (regenerated) are unaffected; the rest of the tree MUST be clean.
- [ ] 7.2 For any remaining hits, update the file (or add an exception comment in this `tasks.md` justifying why it is intentionally not renamed).
- [ ] 7.3 Re-run `pnpm verify` once more after the sweep to ensure no regression.

## E2E test impact

### Must pass unchanged

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — re-validates the full local-Supabase flow (auth, CV CRUD, media upload) against the renamed project. No scenario changes; only the underlying `project_id` and env var names change.
- `apps/api/test/e2e/cv-crud.e2e-spec.ts` — CV item CRUD against the renamed project.
- `apps/api/test/e2e/mcp-server.e2e-spec.ts` — MCP server smoke test (the MCP server name is renamed, but the test contract and tool invocations remain valid).
- `apps/api/test/e2e/media-upload.e2e-spec.ts` — media storage round-trip against the renamed project.

### Update required

- None. No E2E contract is changing; only identifiers and env var names. If a test was hard-coding the literal `resumind` project name in a setup string, fix the string in the test setup file (not the scenario), then re-run.

### Add

- None — UI-only / identifier-only change.
