## ADDED Requirements

### Requirement: The monorepo SHALL include an import agent workspace

The repository SHALL add `apps/import-agent` to `pnpm-workspace.yaml` with scripts for `typecheck`, `test`, and `build` (or `test` only if library-style) included in Turborepo pipelines. The repository SHALL add `packages/import-models` containing a pinned Mastra provider/model catalog and an optional sync script (e.g. `pnpm import-models:sync`) sourced from Mastra models.dev metadata. Root documentation SHALL list server env vars: `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`, optional search API key, `PDF_IMPORT_MAX_BYTES`, and `PDF_IMPORT_ENABLED`. Per-user LLM API keys are configured via the product UI, not committed env files.

#### Scenario: Root verify includes import-agent tests

- **WHEN** a developer runs `pnpm test` or `pnpm verify` at the repository root
- **THEN** Turborepo SHALL execute unit tests in `apps/import-agent` when defined

#### Scenario: Developer discovers import env vars

- **WHEN** a developer reads root README or `apps/api/.env.example` after this change
- **THEN** PDF import-related environment variables SHALL be documented

## MODIFIED Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import consumed by `apps/api`.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README
