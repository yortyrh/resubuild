## MODIFIED Requirements

### Requirement: The monorepo SHALL include an import agent workspace

The repository SHALL add `apps/import-agent` to `pnpm-workspace.yaml` with scripts for `typecheck`, `test`, and `build` (or `test` only if library-style) included in Turborepo pipelines. The repository SHALL add `packages/import-models` containing a pinned Mastra provider/model catalog and an optional sync script (e.g. `pnpm import-models:sync`) sourced from Mastra models.dev metadata. Root documentation SHALL list server env vars: `AI_AGENT_ENCRYPTION_KEY` (legacy alias `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`), `PDF_IMPORT_MAX_BYTES`, and `PDF_IMPORT_ENABLED`. Per-user LLM and Tavily/Firecrawl API keys are configured via the product UI, not committed env files.

#### Scenario: Root verify includes import-agent tests

- **WHEN** a developer runs `pnpm verify` at the repository root
- **THEN** Turborepo SHALL execute `apps/import-agent` test (and typecheck/build when defined) alongside other workspace packages

#### Scenario: Setup script documents UI-first keys

- **WHEN** a developer runs `pnpm setup:env` interactively or with `--non-interactive`
- **THEN** the generated `apps/api/.env` SHALL include `AI_AGENT_ENCRYPTION_KEY`
- **AND** SHALL NOT require or prompt for server-wide `SEARCH_API_KEY`
