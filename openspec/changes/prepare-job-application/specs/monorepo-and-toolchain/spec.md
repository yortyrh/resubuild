## MODIFIED Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

## ADDED Requirements

### Requirement: Local Supabase configuration SHALL enable Realtime for application chat

`supabase/config.toml` SHALL set `[realtime] enabled = true` so local development supports Realtime subscriptions on `job_application_message`. Documentation SHALL note that hosted Supabase projects must enable Realtime and publication for the messages table in non-local environments.

#### Scenario: Local Realtime enabled

- **WHEN** a developer runs Supabase locally from this repository's config
- **THEN** Realtime SHALL be enabled for client subscriptions during application workspace development
