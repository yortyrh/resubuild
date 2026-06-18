## MODIFIED Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, typecheck, and test to Turborepo. The `apps/import-agent` workspace SHALL host Mastra workflows and tools for resume import **and job application preparation** consumed by `apps/api`. The repository MUST expose a root-level `pnpm icons:generate` script that runs `node scripts/generate-icons.mjs`, and `turbo.json` MUST declare a top-level `icons` task (with outputs covering the regenerated icon files under `apps/web/public/` and `apps/web/src/app/favicon.ico`) so that `apps/web#build` declares `"dependsOn": ["icons"]` and runs the generator before packaging the web app.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

#### Scenario: `pnpm build` regenerates web icons before building the web app

- **WHEN** a developer runs `pnpm build` after editing `apps/web/public/icon.svg` or `scripts/generate-icons.config.mjs`
- **THEN** Turborepo runs the `icons` task before `apps/web#build`
- **AND** the regenerated PNG/ICO artifacts are present in `apps/web/public/` and `apps/web/src/app/favicon.ico` before the Next.js build reads them
