## Context

The monorepo is a Turborepo + pnpm workspace containing seven packages (`apps/web`, `apps/api`, `apps/import-agent`, `packages/schemas`, `packages/types`, `packages/resume-template`, `packages/import-models`). All workspace names, internal dependency scopes, and `pnpm --filter` references in the root `package.json` use the `@resumind/*` scope. The local Supabase project is `project_id = "resumind"` in `supabase/config.toml`, and the setup script template (`scripts/setup-local-env.sh`) writes env vars that match. ~200 in-repo occurrences of "resumind" exist across source, configs, fixtures, and docs. The `openspec/changes/deploy-railway-self-hosted-supabase` change is already in flight and will provision external Supabase and Railway services — it needs a settled brand name before it can run.

No runtime behavior depends on the brand name other than:

1. The `name` field in each `package.json` (cosmetic, but matters for `pnpm --filter`).
2. The MCP server name exposed to clients via `apps/api/src/mcp/**` (visible to users in their MCP client config).
3. The local Supabase `project_id` (affects CLI commands, port defaults, Docker volume names).

## Goals / Non-Goals

**Goals:**

- Single source of truth: every `package.json` `name`, every `workspace:*` reference, and every `pnpm --filter` script uses `@resubuild/*`.
- Local Supabase `project_id` and env template defaults match the new name.
- User-visible brand strings (MCP server name, dev-server title, README, sample fixtures) say "Resubuild".
- `pnpm verify` passes (format, lint, typecheck, unit tests, build) on the renamed tree.
- Local `pnpm test:e2e` is re-validated end-to-end against the renamed local Supabase project.

**Non-Goals:**

- Renaming anything under `openspec/changes/archive/` (historical provenance).
- Touching external infrastructure (Railway service name, remote Supabase project) — that is owned by `deploy-railway-self-hosted-supabase` and will pick up the new name when it provisions.
- Rewriting API routes, data models, or any feature code beyond strings, identifiers, and the project config noted above.
- Renaming sample seed data IDs (those are random UUIDs, not brand-derived).

## Decisions

### Decision 1: Keep the kebab-case `@resubuild/*` scope; do NOT collapse to a flat `resubuild/*`

- **Why**: preserves the existing `@scope/name` workspace convention that the lockfile, Turborepo filtering, and package import paths already expect. A flat name would force every internal import (e.g. `@resubuild/web` → `resubuild/web`) to change paths and break the workspace contract.
- **Alternative considered**: drop the scope entirely (`resubuild/web`). Rejected because the workspace tooling would have to be reconfigured and there is no behavioral benefit.

### Decision 2: Rename `supabase/config.toml` `project_id` and wipe the local volume as part of the migration

- **Why**: Supabase CLI keys derived state (Docker container names, volume paths, internal URLs) on `project_id`. Renaming the file without wiping the volume leaves orphan containers named after the old project and breaks `supabase start`.
- **Alternative considered**: keep `project_id = "resumind"` and only rename code-level env vars. Rejected because the local dev experience would still show "resumind" in `supabase status` and the Railway change would have to re-rename later.

### Decision 3: Treat env var rename as a hard break in local `.env*` files

- **Why**: `RESUMIND_API_KEY` → `RESUBUILD_API_KEY` is a non-backward-compatible identifier change. Document it in the README and the verify step. CI uses placeholder values, so this only affects developers who have local `.env` checked out.
- **Alternative considered**: keep both names with a deprecation shim. Rejected — YAGNI; the project has not been deployed yet, and the rename happens before any external consumer is wired up.

### Decision 4: Skip `openspec/changes/archive/`

- **Why**: archived change proposals are historical records. Editing them would falsify provenance and make `git log` on those directories misleading.
- **Alternative considered**: rename everywhere for full consistency. Rejected per the user direction in the proposal.

### Decision 5: Two capabilities get a delta spec; the rest are not modified

- `monorepo-and-toolchain` — the scenario language mentions the brand.
- `web-application` — the dev-server title scenario mentions the brand.
- All other capabilities (`cv-editor-ui`, `mcp-server`, etc.) reference the brand in prose only, with no behavioral scenario, so they do not get a delta file. Their prose will be updated in-place only if/when each capability's spec is next edited.

## Risks / Trade-offs

- [Risk] Missed occurrence of "resumind" causes a stale brand surface (e.g. a console log, a fixture, a doc). → Mitigation: a follow-up `rg -i "resumind"` step in `tasks.md` excludes the archive and lists any remaining hits.
- [Risk] Lefthook or CI caches the old lockfile and trips on stale paths. → Mitigation: regenerate the lockfile with `pnpm install` and let CI run clean. The verify step in tasks.md requires `pnpm verify` to pass locally first.
- [Risk] MCP clients that have already cached the old server name (`resumind-mcp`) will not auto-discover `resubuild-mcp`. → Mitigation: documented in README "After this change, re-add the MCP server entry in your client."
- [Risk] Local Supabase data is destroyed when the volume is wiped. → Mitigation: documented in the migration step of `tasks.md`; only seed data and a single test user are involved, and `pnpm samples:seed` re-creates them.

## Migration Plan

1. Apply code/config renames in a single atomic commit (or in clearly grouped commits: package scopes → supabase/project_id → env vars + docs).
2. Wipe local Supabase state: `supabase stop --no-backup` (or `docker compose down -v` on the supabase compose dir), then `supabase start` to recreate with the new `project_id`.
3. `pnpm install` to regenerate `pnpm-lock.yaml`.
4. `pnpm samples:seed` to re-populate the e2e fixture against the renamed project.
5. `pnpm verify` from the repository root to prove format, lint, typecheck, tests, and build all pass.
6. `pnpm test:e2e` from `apps/api` to re-validate the e2e flow against the renamed local Supabase.

**Rollback**: revert the commit(s). Local Supabase volume would need to be re-wiped and seeded under the old name. No external consumers exist yet, so rollback risk is limited to the developer machine.

## Open Questions

- None blocking. If the user wants the MCP server display name to differ from the npm scope (e.g. friendly "Resubuild MCP" vs. internal `resubuild-mcp`), that is a one-line follow-up and does not block this change.
