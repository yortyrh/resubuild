## MODIFIED Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`. The repository MUST expose a root-level `pnpm icons:generate` script that runs `node scripts/generate-icons.mjs`, and the root `pnpm build` script MUST chain `pnpm icons:generate && turbo build` so the web icon pipeline always runs to completion before Turborepo orchestrates the workspace builds.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

#### Scenario: `pnpm build` regenerates web icons before building the web app

- **WHEN** a developer runs `pnpm build` after editing `apps/web/public/icon.svg` or `scripts/generate-icons.config.mjs`
- **THEN** the root `build` script invokes `pnpm icons:generate` first
- **AND** Turborepo then orchestrates the workspace builds with the regenerated PNG/ICO artifacts already in place
