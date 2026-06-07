## ADDED Requirements

### Requirement: The api image SHALL document its production environment variable surface for the release-1 docker compose target

The `apps/api` workspace MUST document (in `apps/api/README.md`
or a sibling `apps/api/.env.example` header comment block) the
set of environment variables the api image consumes when run
inside `docker-compose.prod.yml` against a non-self-hosted
Supabase project. The documented set MUST include every key
the release-1 prod env generator writes for the api service
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`MEDIA_BUCKET`, `MCP_EXPORT_BUCKET`, `CORS_ORIGIN`, `APP_URL`,
`PUBLIC_API_URL`, `PORT`, `AI_AGENT_ENCRYPTION_KEY`,
`PDF_IMPORT_MAX_BYTES`, `PDF_IMPORT_ENABLED`, plus the optional
`CHROMIUM_EXECUTABLE_PATH`, `MCP_KEY_PEPPER`,
`MCP_SERVER_ENABLED`, `MCP_EXPORT_TTL_SECONDS`,
`MCP_EXPORT_MAX_BYTES` and `IMPORT_MODELS_CATALOG_SOURCE` per
`apps/api/.env.example`). For each variable the documentation
MUST list (a) whether the api requires it, treats it as
optional, or derives a default when unset, and (b) which
controller / service reads it, so the release-1 generator and
the running api stay in sync. The documentation MUST NOT
introduce new env vars; it only enumerates the ones already
read by `apps/api/src/**`.

#### Scenario: Operator audits the api env surface before first deploy

- **WHEN** an operator reads `apps/api/README.md` (or the
  `.env.example` header block) before running
  `pnpm setup:env:prod`
- **THEN** they see a table that maps every env var the
  generator writes to the api service
- **AND** the table names the controller / service that
  consumes the var (e.g. `MEDIA_BUCKET` → `MediaService`,
  `MCP_EXPORT_BUCKET` → `McpExportService`,
  `AI_AGENT_ENCRYPTION_KEY` → `AiAgentCryptoUtil`,
  `PDF_IMPORT_MAX_BYTES` → `ImportController`)
- **AND** missing required keys are flagged so the operator
  knows to set them in the manifest
