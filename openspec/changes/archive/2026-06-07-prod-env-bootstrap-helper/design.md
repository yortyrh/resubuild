## Context

resubuild today is set up to run locally against the Supabase CLI
(`supabase start` + `pnpm setup:env` + `pnpm samples:seed`). The
local setup script at `scripts/setup-local-env.sh` reads
`supabase status -o env` and writes `apps/api/.env` and
`apps/web/.env` with the local stack's `API_URL`, `ANON_KEY`,
`SERVICE_ROLE_KEY`, and `JWT_SECRET`, plus a freshly generated
`AI_AGENT_ENCRYPTION_KEY`. It also walks `supabase/config.toml`'s
`[storage.buckets.*]` blocks and provisions any missing buckets
through the Storage REST API.

Release 1 changes the deploy target: a single Docker Compose project
that runs the built `apps/web` and `apps/api` images against a
**non-self-hosted** Supabase project (the cloud dashboard at
`https://supabase.com/dashboard`). The env-var surface the
containers need is the same as the local stack except for a few
deployment-only knobs:

- `SUPABASE_URL` is the project's API URL
  (`https://<project-ref>.supabase.co`), not `http://127.0.0.1:54321`.
- `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` come from
  **Project Settings → API** in the cloud dashboard.
- `SUPABASE_JWT_SECRET` is optional in the local script
  (Supabase auth uses the project's signing key, not the legacy
  JWT secret), and stays optional in prod.
- `CORS_ORIGIN` and `PUBLIC_API_URL` reflect the **public** domains
  the operator owns (e.g. `https://app.example.com` and
  `https://api.example.com`), not `http://localhost:3000` /
  `http://localhost:3001`.
- `CHROMIUM_EXECUTABLE_PATH` matters in production Docker
  (Puppeteer's bundled browser is unreliable in slim images); the
  local script can ignore it.
- `MCP_*` env vars are documented in `apps/api/.env.example` and are
  now first-class for prod (the MCP server is enabled in cloud
  deployments by default; `MCP_SERVER_ENABLED=false` stays as an
  opt-out).

The desired end state: an operator with a Supabase project + a
target host can run `pnpm setup:env:prod` once, get a complete
`.env.prod` next to `docker-compose.prod.yml`, and `docker compose
-f docker-compose.prod.yml up` works without further secrets
surgery. The same operator can also drive the same generator from
an LLM agent via `/opsx:setup-prod-env` (cursor command) or the
`setup-prod-env` skill without copy/pasting secrets through chat.

## Goals / Non-Goals

**Goals**

- A single, deterministic generator that produces a complete
  `.env.prod` with all required web + api variables for the cloud
  Supabase + Docker Compose target.
- Two input modes: interactive prompts (default) and a
  `--from <path>` JSON manifest (for CI / agents / repeat runs).
- A non-interactive placeholder check: refuse to write when
  `AI_AGENT_ENCRYPTION_KEY` is still the literal
  `change-me-to-a-long-random-secret` and no `--force` flag is
  passed.
- A `--dry-run` mode that prints the would-be `.env.prod` to stdout
  for review, matching the pattern in
  `scripts/setup-local-env.sh --dry-run`.
- A root-level `docker-compose.prod.yml` skeleton that consumes
  `.env.prod` via `env_file` and starts `web` + `api`. The compose
  file is intentionally minimal (no TLS, no reverse proxy, no
  registry push) and is documented as such.
- A `.cursor/skills/setup-prod-env/SKILL.md` plus a thin
  `/opsx:setup-prod-env` cursor command that wrap the script for
  agents. The skill is the menu-driven wrapper; the script is the
  engine.
- `.env.prod` and `prod-secrets.json` are gitignored so generated
  artifacts and intermediate manifests never enter version control.
- README cross-links: a **Release 1: cloud Supabase + docker
  compose** section that points at the script, the skill, and the
  compose file, and lists the env vars the operator should
  pre-gather.

**Non-Goals**

- TLS termination, reverse proxy (Caddy / Traefik / nginx),
  registry push, or multi-host orchestration. Those belong to
  sibling release-1 changes.
- Generating `supabase/config.toml` or migrations for the cloud
  project. The operator uses `supabase link` + `supabase db push`
  per the existing `Cloud Supabase setup` section of the README.
- Validating the **contents** of `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` against the cloud project (i.e. a round-trip
  `auth.getUser()` probe). The script writes what the operator
  pastes and refuses only on the placeholder check. Live
  validation can be added later; the first iteration is
  deterministic and offline.
- Supporting self-hosted Supabase / `docker compose` of the
  Supabase services. The cloud dashboard is the only target for
  release 1.
- Auto-running `supabase db push`. The operator still runs that
  themselves; the generator is env-only.
- Capturing per-user secrets (provider API keys, Tavily / Firecrawl
  keys). Those remain UI-only per the existing
  `ai-agent-accounts` / `import-llm-config` flows.

## Decisions

### Decision: Single root-level `.env.prod`, not per-app files

The local stack uses `apps/api/.env` + `apps/web/.env` because the
two apps run on different hosts (separate `pnpm dev` commands) and
each picks up its own file. In Docker Compose, the `web` and `api`
services share the host's filesystem via `env_file`, so a single
`.env.prod` at the repo root is simpler to manage and easier to
keep in sync. Docker Compose's `environment:` block can still
selectively override per service (e.g. `NEXT_PUBLIC_API_URL` is
only consumed by `web`; the api image does not need it at
runtime), but the file itself is shared.
**Alternatives considered**: per-app `.env.prod` files
(rejected — duplicates the same Supabase keys in two places; the
operator has to rotate in two files when a key is rotated);
templated `.env.prod.in` with `envsubst` (rejected — adds a
runtime dependency on `gettext-base` / `envsubst` for a tool that
already needs Node).

### Decision: Node ESM module (`scripts/setup-prod-env.mjs`), not Bash

`scripts/setup-local-env.sh` is Bash because it has to drive the
Supabase CLI (`supabase status -o env`) and the Storage REST API
via `curl`, and Bash is fine for that. The prod generator does
**not** talk to Supabase at runtime — it only validates and
formats a manifest — so we can drop the Bash dependency and write
it as a `.mjs` script. Node gives us:

- First-class JSON manifest parsing (the existing `package.json`
  already declares Node 22).
- `node:readline/promises` for the interactive prompts.
- `node:crypto.randomBytes` for the fallback
  `AI_AGENT_ENCRYPTION_KEY` (matching the Bash script's
  `openssl rand -base64 32`).
- Vitest is already in the workspace; we can unit-test the
  manifest validator in `scripts/setup-prod-env.spec.mjs` next to
  the script (per the project rule that unit tests sit beside
  tested files).

**Alternatives considered**: TypeScript (`scripts/setup-prod-env.ts`)
(rejected — every other root-level script is a plain `.mjs` or
`.sh`; introducing a root-level `tsconfig.json` + `tsx` runner
just for this is overkill); a Bun script (rejected — adds a
runtime dependency to the repo for one script).

### Decision: Manifest schema as a sibling module (`scripts/lib/env-prod-schema.mjs`)

The manifest validator (required keys, types, placeholder check,
defaults for optional keys like `PORT=3001`,
`MEDIA_BUCKET=media`, `MCP_EXPORT_BUCKET=mcp-exports`,
`PDF_IMPORT_MAX_BYTES=5242880`, `PDF_IMPORT_ENABLED=true`) lives
in `scripts/lib/env-prod-schema.mjs` so the SKILL, the cursor
command, and the script all share the same source of truth. The
schema module exports pure functions (`parseManifest`,
`validateManifest`, `serializeToDotenv`) and has no I/O. The
script under `scripts/setup-prod-env.mjs` is the thin I/O shell
that reads the manifest, calls the schema module, and writes
`.env.prod`. This matches the structure of `scripts/lib/*` that
the existing scripts use.
**Alternatives considered**: inlining the schema in
`setup-prod-env.mjs` (rejected — the SKILL also needs it for
manifest previews, and duplicating it would drift); a JSON Schema
file loaded with `ajv` (rejected — the prod manifest is small
enough that hand-rolled validation is clearer and the dependency
overhead is not worth it).

### Decision: Interactive prompts with `--from <file>` override

The default UX is interactive: the script walks the operator
through each variable, shows the current value (if any) and a
short description, and supports hidden input (e.g. via
`readline.emitKeypressEvents` + `process.stdin.setRawMode`) for
the secret-shaped variables (`SUPABASE_SERVICE_ROLE_KEY`,
`AI_AGENT_ENCRYPTION_KEY` if the operator does not want the
generated one). `--from <path>` reads a JSON manifest, skips
prompts, and refuses to start when a required key is missing.
A `--dry-run` flag prints the would-be file to stdout. A
`--force` flag lets the operator override the placeholder check
(useful for the second deploy where the operator already has a
real key in the manifest but a downstream tool stripped it).
**Alternatives considered**: prompts only, no manifest (rejected
— breaks CI / agent flows); manifest only, no prompts (rejected
— first-run UX is poor; the operator has to read the README and
type the manifest by hand); a separate `--ci` mode (rejected —
`--from <file>` is already the CI mode).

### Decision: `docker-compose.prod.yml` is intentionally minimal

The compose file declares two services (`web`, `api`) plus a
shared `resubuild-net` bridge network. Both services use the
built images (`apps/web/Dockerfile`, `apps/api/Dockerfile` —
which already exist from the release-1 docker change) and read
`env_file: .env.prod`. The api service additionally mounts a
named volume for Puppeteer's browser cache. No TLS, no reverse
proxy, no healthcheck-driven `depends_on: { api: { condition:
service_healthy } }` for release 1 — those are sibling
release-1 changes. The compose file is documented as the
"minimum viable prod" and links to the follow-on work in its
header comment.
**Alternatives considered**: a single `docker-compose.yml` with
profiles (`prod`, `local`) (rejected — profile-driven compose
files are harder to read and audit, and the two targets have
very different service shapes); a full production compose with
Caddy / Traefik / Let's Encrypt baked in (rejected — out of
scope for this change; that's a separate release-1 change).

### Decision: Skill + cursor command wrap the script, do not re-implement it

The SKILL is a thin menu of questions (which Supabase project,
which bucket names, do you want MCP enabled, etc.) that ends in
"now run `pnpm setup:env:prod --from /tmp/manifest.json`". The
cursor command (`/opsx:setup-prod-env`) is a one-shot wrapper
that does the same thing without a long preamble. The script is
the engine; the SKILL and the command are the steering wheels.
The SKILL is the only place an LLM agent is expected to read
secrets into its context, and it explicitly tells the agent to
use a `prod-secrets.json` manifest on disk instead of pasting
secrets into chat.
**Alternatives considered**: a single Bash entry point that
auto-detects TTY vs manifest and prompts accordingly
(rejected — the existing skill/cursor command pattern is the
project convention for LLM-driven workflows); making the SKILL
the engine (rejected — the script must work in CI / cron /
non-interactive shells, which skills cannot).

### Decision: Generated `.env.prod` is gitignored; manifest is too

Both `.env.prod` and any `prod-secrets.json` (the JSON manifest
the operator or agent writes to feed `--from`) are added to
`.gitignore`. The release-1 `setup-prod-env` command prints a
warning if it detects a tracked `.env.prod` so the operator
knows something has gone wrong.
**Alternatives considered**: keeping `prod-secrets.json`
tracked in a "template" form with placeholder values (rejected
— the operator would accidentally commit a real manifest; the
gitignore is the safest default).

## Risks / Trade-offs

- **[Operator forgets to rotate `AI_AGENT_ENCRYPTION_KEY`]** The
  script auto-generates the key on first run and refuses to
  overwrite an existing real key, but if the operator copies the
  generated file across two hosts without rotating, both hosts
  share the same per-user encryption key. → The script prints a
  one-line warning on every run ("key was last generated
  YYYY-MM-DD; consider rotating quarterly") and the
  `prod-env-bootstrap-helper` spec documents the rotation step.
- **[Cloud Supabase dashboard UI changes]** The script is
  offline and does not call `auth.getUser()` or the Storage API;
  the operator is responsible for pasting the right values from
  the dashboard. If the dashboard renames `anon` to `publishable`
  in the future, the script still writes the same keys; only
  the README hint and the prompt text need to change. → Keep the
  prompt text and the README in sync; the spec scenario for
  "operator collects keys" is the check.
- **[Manifest drift between dev and prod]** The manifest uses
  the **same key names** as `apps/api/.env.example` and
  `apps/web/.env.example`, but the prod script does not import
  the example files. If a future env var is added to the example
  but not to the prod manifest schema, the prod env file will
  silently miss it. → A unit test in
  `scripts/lib/env-prod-schema.spec.mjs` enumerates the keys
  declared in `apps/api/.env.example` and
  `apps/web/.env.example` and asserts every non-comment line
  appears in the manifest schema. Failing this test is the
  signal to update the schema.
- **[Docker Compose `env_file` is permissive about format]** A
  hand-edited `.env.prod` with Windows line endings or stray
  BOMs will silently work in Compose but break `dotenv`-style
  loaders elsewhere. → The script writes UTF-8 with LF line
  endings explicitly (`fs.writeFileSync(path, content, {
encoding: 'utf8' })`) and rejects manifests with `\\r` in
  values at validation time.
- **[SKILL is a chat-driven surface for secrets]** Even though
  the SKILL points operators at a manifest file, an unwary
  agent or operator may paste `SUPABASE_SERVICE_ROLE_KEY` into
  the chat. → The SKILL's `## Guardrails` section is explicit:
  "Never echo a secret value back to the user; treat the
  manifest file as the only safe place for secret material."
  The spec scenario for "agent never echoes secret values" is
  the check.
- **[Two env-var surfaces to keep in sync]** The local
  `pnpm setup:env` writes `apps/{api,web}/.env`; the new
  `pnpm setup:env:prod` writes root `.env.prod`. If a future
  feature adds an env var to one but not the other, the
  existing local stack and the new prod stack drift. → The
  manifest schema test (above) covers the prod side; we add a
  sibling unit test in `scripts/setup-local-env.spec.sh`
  (future work) to cover the local side.

## Migration Plan

This change is non-breaking for end users and adds a new path
side-by-side with the existing `pnpm setup:env`. Rollout:

1. Land the spec deltas in this change (no deploy).
2. Land the script, the manifest schema, the SKILL, the cursor
   command, and the compose skeleton in a single PR. CI runs
   `pnpm verify`; no env files are written during CI, so the
   test of the script is its own unit tests
   (`scripts/setup-prod-env.spec.mjs`,
   `scripts/lib/env-prod-schema.spec.mjs`).
3. Manually exercise the script against a throwaway Supabase
   project: `pnpm setup:env:prod --dry-run` (no writes),
   `pnpm setup:env:prod --from prod-secrets.json` (writes
   `.env.prod`), then `docker compose -f docker-compose.prod.yml
config` (sanity check that compose parses the file).
4. Update the README with the **Release 1: cloud Supabase +
   docker compose** section and the env-var checklist.
5. Communicate the new commands in the next contributor-facing
   release notes.

Rollback is per-file: removing the script + the SKILL + the
cursor command + the compose skeleton reverts the change
without affecting the existing `pnpm setup:env` flow. The
`.gitignore` entries can stay (they are additive and harmless).

## Open Questions

- Do we want `pnpm setup:env:prod` to also generate
  `apps/api/.env` and `apps/web/.env` from the same manifest so a
  developer can run the same generator locally with a cloud
  Supabase? → Defer; the local script already covers the
  all-local case. A "cloud-backed local dev" workflow is a
  follow-up.
- Should the SKILL support re-running the generator to rotate a
  single key (e.g. "rotate `AI_AGENT_ENCRYPTION_KEY` only")? →
  Defer; the first iteration is full-file regeneration. A
  per-key rotation mode is a follow-up.
- Should the script also support `docker compose
--env-file .env.prod up` directly (a thin `pnpm prod:up`
  alias)? → Defer; the operator can run `docker compose -f
docker-compose.prod.yml --env-file .env.prod up` themselves.
  A pnpm alias is a follow-up.
- Where do per-user LLM / Tavily / Firecrawl keys live in prod?
  → Out of scope; the existing
  `openspec/specs/import-llm-config` flow already routes them
  through the UI. The prod env file does not need them.
