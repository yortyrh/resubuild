# Monorepo and toolchain

## Purpose

Document how the Resumind repository is organized and which tools enforce quality, so agents and humans can navigate the codebase and run the same checks as CI.

## Requirements

### Requirement: The repository SHALL be a pnpm + Turborepo monorepo with defined workspaces

Applications and shared packages live under `apps/*` and `packages/*` per `pnpm-workspace.yaml`, and root scripts SHALL delegate build, dev, lint, and test to Turborepo.

#### Scenario: Developer runs quality checks from the repo root

- **WHEN** they run `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm test`, or `pnpm build` at the repository root
- **THEN** Turborepo orchestrates the corresponding scripts in each workspace that defines them, matching the documented developer workflow in the root README

### Requirement: Continuous integration SHALL run format, lint, test, and build

CI on `main` MUST use GitHub Actions on pushes and pull requests with frozen lockfile install, Prettier check, ESLint, tests with coverage, and production builds as defined in `.github/workflows/ci.yml`.

#### Scenario: CI validates a pull request

- **WHEN** a pull request targets `main`
- **THEN** the workflow installs dependencies with `pnpm install --frozen-lockfile`, runs `pnpm format:check`, `pnpm lint`, `pnpm test`, and `pnpm build` with placeholder public env vars for the web app as in CI configuration
