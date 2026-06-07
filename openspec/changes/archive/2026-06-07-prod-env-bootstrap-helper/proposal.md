## Why

Release 1 of resubuild runs in Docker Compose against a non-self-hosted
Supabase project, but there is no first-class tool that walks an
operator through the ~15 environment variables the web and api images
need (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`AI_AGENT_ENCRYPTION_KEY`, `MEDIA_BUCKET`, `MCP_EXPORT_BUCKET`, the
CORS / public-URL pair, optional Chromium / MCP flags, etc.). Today the
only options are (a) copy `apps/api/.env.example` / `apps/web/.env.example`
and hand-fill them — a process that has already produced deploys with
the placeholder `change-me-to-a-long-random-secret` for
`AI_AGENT_ENCRYPTION_KEY` — or (b) use `pnpm setup:env`, which only
works against a local Supabase stack (`supabase status -o env`) and
fails on a cloud project. Without a single, deterministic generator
the release-1 docker compose target cannot be reproduced by a second
operator without copying secrets out of band.

## What Changes

- Add a deterministic `pnpm setup:env:prod` script (and a `--dry-run`
  variant) that writes a single root-level `.env.prod` consumed by
  docker compose (`env_file: .env.prod`). The script is a Node
  module under `scripts/setup-prod-env.mjs` (next to the existing
  `setup-local-env.sh`) and prompts the operator for every required
  value, accepts `--from <path>` to read a JSON manifest, generates
  `AI_AGENT_ENCRYPTION_KEY` when absent, and refuses to write when
  required values are still the placeholder.
- Add a matching `docker-compose.prod.yml` skeleton at the repo root
  that runs `apps/web` and `apps/api` against the cloud Supabase
  project, reading `.env.prod` via `env_file`. The compose file is
  intentionally minimal: no TLS terminator, no registry push, no
  reverse proxy. Subsequent release-1 changes can extend it.
- Add a `.cursor/skills/setup-prod-env/SKILL.md` plus a thin
  `/opsx:setup-prod-env` cursor command that wrap the script for LLM
  agents. The skill collects the manifest (or reuses one on disk),
  invokes the script with `--from`, and never embeds raw secrets in
  its own output.
- Add `.env.prod` and any `prod-secrets.json` manifest to `.gitignore`
  so the generated artifacts never enter version control.
- Extend `README.md` with a short **Release 1: cloud Supabase + docker
  compose** section that links to the script, the skill, and the
  compose file, and lists the same set of env vars the script prompts
  for so the operator can pre-gather them.

## Capabilities

### New Capabilities

- `prod-env-bootstrap-helper`: defines the contract for the prod env
  generator (script, SKILL, cursor command, output `.env.prod`,
  compose skeleton, gitignore rules) and the variables it must
  produce. This is the umbrella spec for this change.

### Modified Capabilities

- `monorepo-and-toolchain`: the "Root scripts SHALL support local
  Supabase setup, E2E execution, and local API debug helpers"
  requirement grows a sibling `pnpm setup:env:prod` entry, the
  existing `apps/api` documentation requirement for
  `CHROMIUM_EXECUTABLE_PATH` grows a Release 1 pass-through clause
  (so the prod env generator forwards the operator's Chromium path
  to the api image without losing the local-dev default of letting
  Puppeteer download its own browser), and the spec gains a new
  requirement that the README ships a \*\*Release 1: cloud Supabase
  - docker compose\*\* section pointing at the script, the SKILL,
    the cursor command, and the compose skeleton.
- `cv-rest-api`: an additive requirement documents the production
  env-var surface the api image consumes in the release-1 docker
  compose target, so the contract between the generated
  `.env.prod` and the running api is explicit (no behavior change
  for local dev).

## Impact

- `scripts/setup-prod-env.mjs` (new) and `scripts/lib/env-prod-schema.mjs`
  (new, no-secret manifest schema + validator) — mirrors the layout
  of `scripts/setup-local-env.sh` so the existing `pnpm setup:env`
  flow is not affected.
- `docker-compose.prod.yml` (new at repo root) — `web` and `api`
  services only, both `env_file: .env.prod`, no TLS / no registry.
- `.cursor/skills/setup-prod-env/SKILL.md` (new) and
  `.cursor/commands/setup-prod-env.md` (new).
- `package.json` (root) — adds `setup:env:prod` script.
- `.gitignore` — adds `.env.prod` and `prod-secrets.json`.
- `README.md` — adds the Release 1 section and the env-var checklist.
- `apps/api/.env.example` and `apps/web/.env.example` — no content
  changes; the new script generates a single combined file, not
  per-app files.
- `openspec/specs/monorepo-and-toolchain/spec.md` and
  `openspec/specs/cv-rest-api/spec.md` — additive requirement deltas
  in the spec delta files for this change.
- New `openspec/specs/prod-env-bootstrap-helper/spec.md`.

No API contract changes, no database migrations, no source-code
changes in `apps/web/src` or `apps/api/src` (the script writes env
files only). The `cv-rest-api` delta is documentation-only: it
records that `CHROMIUM_EXECUTABLE_PATH` propagates through the
generated env file in production.
