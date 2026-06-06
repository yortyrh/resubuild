## MODIFIED Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`. The repository, its workspace package names, and its env var prefixes SHALL use the **Resubuild** brand (root `package.json` `name = "resubuild"`, workspace scopes `@resubuild/*`, env vars prefixed `RESUBUILD_*`).

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README
- **AND** all workspace package names resolve to `@resubuild/*` scopes

#### Scenario: Root scripts use the Resubuild workspace scope

- **WHEN** a developer runs `pnpm dev:web`, `pnpm dev:api`, `pnpm dev:types`, `pnpm samples:pdf`, `pnpm import-models:sync`, or `pnpm test:e2e`
- **THEN** the `--filter` argument targets `@resubuild/web`, `@resubind/api`, `@resubuild/types`, `@resubuild/resume-template`, `@resubuild/import-models`, and `@resubuild/api` respectively
- **AND** the filter strings MUST NOT reference `@resumind/*` scopes

#### Scenario: Local Supabase project uses the Resubuild identifier

- **WHEN** a developer runs `supabase start` after cloning the repository
- **THEN** the CLI resolves `supabase/config.toml` and starts a local stack whose `project_id` is `resubuild`
- **AND** `pnpm setup:env` writes `apps/api/.env` and `apps/web/.env` with `RESUBUILD_*` env vars (not `RESUMIND_*`)

## Purpose

Document how the Resubuild repository is organized and which tools enforce quality, so agents and humans can navigate the codebase and run the same checks as CI.
