# Railway deployment

## Purpose

Define the release-1 Railway deployment target for resubuild. The
target reuses the existing `apps/api/Dockerfile` and
`apps/web/Dockerfile` without modification, and shares the
env-var contract from `prod-env-bootstrap-helper` (with a
`--target railway` flag that switches the public-URL placeholders
to Railway-friendly templates). This spec describes the
deployable artifact shape (two `railway.json` files at the
service root directories, a `.railwayignore` at the repo root),
the operator workflow (Cursor SKILL + cursor command), and the
explicit limitations of the Railway target (no Puppeteer cache
volume on the free tier, no automated custom domain TLS, no
preview environments).

## ADDED Requirements

### Requirement: The repository SHALL ship a Railway-ready deployable shape for both apps

The repository MUST provide:

- **`railway.json` at the api service root
  (`apps/api/railway.json`)** — JSON with
  `build.builder: "DOCKERFILE"`, `build.dockerfilePath:
"apps/api/Dockerfile"` (resolved relative to the **repo
  root**, not the service root — Railway's Root Directory
  setting does not affect paths inside `railway.json`), and
  `deploy.startCommand: "node apps/api/dist/main"`. The
  `healthcheckPath` field MUST point at the existing
  `/_health` HTTP endpoint declared by the api service (see
  `apps/api/src/health/health.controller.ts`).
- **`railway.json` at the web service root
  (`apps/web/railway.json`)** — JSON with
  `build.builder: "DOCKERFILE"`, `build.dockerfilePath:
"apps/web/Dockerfile"` (resolved relative to the **repo
  root**, not the service root), and
  `deploy.startCommand: "pnpm --filter @resubuild/web
start"`. The `healthcheckPath` field MUST point at `/`.
- **`.railwayignore` at the repo root** — excludes `node_modules`,
  `.turbo`, `.next`, `.git`, `coverage`, and `**/dist` from the
  Railway build context so the upload size matches what the
  multi-stage Dockerfiles would otherwise rebuild inside the
  container.

The two `railway.json` files MUST NOT hardcode secrets. They
MUST reuse the existing Dockerfiles verbatim — no
`Dockerfile.railway` fork.

#### Scenario: Operator deploys both services to a new Railway project

- **WHEN** an operator creates a Railway project, links the
  resubuild repo, and adds two services (one per `railway.json`)
- **THEN** Railway discovers the build config from each
  `railway.json`
- **AND** the api service builds with `apps/api/Dockerfile` and
  starts with `node apps/api/dist/main`
- **AND** the web service builds with `apps/web/Dockerfile` and
  starts with `pnpm --filter @resubuild/web start`
- **AND** the `.railwayignore` file prevents `node_modules` and
  build caches from being uploaded

#### Scenario: `railway.json` config drift is caught by a unit test

- **WHEN** a developer modifies a `railway.json` file in a way
  that breaks the documented shape (missing `build.builder`,
  wrong `dockerfilePath`, missing `healthcheckPath`)
- **THEN** the unit test
  `scripts/lib/railway-config.spec.mjs` MUST fail with a message
  that names the file and the missing field
- **AND** the test runs as part of `pnpm test` from the repo
  root

### Requirement: The env-var generator SHALL support a Railway target

The existing `pnpm setup:env:prod` script MUST accept a
`--target <name>` flag that selects the public-URL placeholder
template. The default value (`docker-compose`) MUST preserve the
existing behavior (placeholders suitable for the local
`docker-compose.prod.yml` target). The `railway` value MUST
bake the production custom domains into the four public-URL
keys (`CORS_ORIGIN`, `APP_URL` → `https://app.resubuild.dev`;
`PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL` →
`https://api.resubuild.dev`) so the generated `.env.prod` is
immediately deployable. The manifest schema module
(`scripts/lib/env-prod-schema.mjs`) MUST declare a new optional
`DEPLOY_TARGET` key for explicit-target manifests and the
drift test against `apps/api/.env.example` /
`apps/web/.env.example` MUST stay green.

#### Scenario: Operator generates `.env.prod` for the Railway target

- **WHEN** an operator runs
  `pnpm setup:env:prod --target railway --from
prod-secrets.json` with a valid manifest
- **THEN** the script writes `.env.prod` with
  `CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL`, and
  `NEXT_PUBLIC_API_URL` set to Railway-shaped placeholders
- **AND** the script prints a one-line note reminding the
  operator to replace the placeholders with the Railway-printed
  public domain after the first deploy
- **AND** the existing `--target` absence (or `--target
docker-compose`) preserves the current docker compose
  placeholders verbatim — no behavior change for the existing
  target

#### Scenario: Operator previews the Railway target with `--dry-run`

- **WHEN** an operator runs
  `pnpm setup:env:prod --target railway --dry-run --from
prod-secrets.json`
- **THEN** the script prints the would-be `.env.prod` to stdout
  without writing to disk
- **AND** the printed dotenv shows the Railway-shaped URL
  placeholders distinctly from the docker compose placeholders
  so the operator can tell the two targets apart

### Requirement: The operator workflow MUST reuse the manifest-on-disk pattern

The Railway operator workflow MUST walk the operator (or an LLM
agent) through the Railway deploy using the same
`prod-secrets.json` manifest the existing `setup-prod-env` SKILL
uses. The workflow lives in a new Cursor SKILL at
`.cursor/skills/railway-deploy/SKILL.md` and a matching cursor
command at `.cursor/commands/railway-deploy.md` (invoked as
`/opsx:railway-deploy`). The workflow MUST:

1. Confirm `.env.prod` exists (run
   `pnpm setup:env:prod --target railway --from
prod-secrets.json` if not).
2. Document the two-service Railway topology (one `api` service,
   one `web` service) and the per-service Variables subset
   (which keys go to which service).
3. Walk the operator through the cross-service handshake:
   `CORS_ORIGIN` / `APP_URL` / `PUBLIC_API_URL` on the api
   service MUST point at the web service's public domain;
   `NEXT_PUBLIC_API_URL` on the web service MUST point at the
   api service's public domain.
4. Print the `pnpm deploy:railway` preflight check and the
   `railway up --service api` / `railway up --service web`
   commands.
5. Verify the deploy with `curl
https://api.resubuild.dev/_health` and
   `curl https://app.resubuild.dev/`.

The SKILL MUST NOT echo secret values back to the user. The
SKILL MUST treat the manifest file (`prod-secrets.json`) as the
only safe place for secret material.

#### Scenario: Operator follows the SKILL to a working Railway deploy

- **WHEN** an operator opens `.cursor/skills/railway-deploy/SKILL.md`
  and runs the steps in order with a valid `prod-secrets.json`
- **THEN** the SKILL walks them through: (1) regenerating
  `.env.prod` with `--target railway`, (2) creating the Railway
  project + two services, (3) pasting per-service Variables, (4)
  wiring the cross-service URLs, (5) running the preflight, (6)
  deploying, (7) verifying with two `curl` checks
- **AND** the operator never needs to type a secret value into
  the chat

#### Scenario: LLM agent runs the cursor command and stops at confirmation

- **WHEN** an LLM agent invokes the `/opsx:railway-deploy`
  cursor command
- **THEN** the command writes the manifest to
  `prod-secrets.json` (or reuses an existing one on disk)
- **AND** runs `pnpm setup:env:prod --target railway
--from prod-secrets.json --dry-run` first for review
- **AND** stops and asks the operator to confirm before running
  the script again without `--dry-run` and before invoking
  `railway up`

### Requirement: The Railway target SHALL document App Sleeping (scale to zero) and the operator must enable it

The release-1 Railway target MUST support scale-to-zero via
Railway's per-service App Sleeping toggle. Railway implements this per-service via the "App
Sleeping" dashboard toggle in **Settings → App Sleeping**;
enabling it is the operator's responsibility on each service.
The SKILL MUST document the toggle in the service-configuration
workflow (Step 4d) and the README's Railway subsection MUST
mention it. App Sleeping is not representable in
`railway.json` / `railway.toml` — the config-as-code schema
does not include a sleep / scale-to-zero field — and the
release-1 SKILL explicitly does not attempt to drive the
toggle via a `railway api` call (the public Railway API does
not currently expose a stable App Sleeping endpoint).

#### Scenario: Operator enables App Sleeping on both services

- **WHEN** an operator opens each service's **Settings →
  App Sleeping** panel in the Railway dashboard and toggles
  **Enable App Sleeping** on
- **AND** triggers a new deployment for the change to take
  effect
- **THEN** the service is put to sleep after 10 minutes of
  outbound inactivity and wakes on the next inbound request
- **AND** the operator does not need to re-edit `railway.json`
  to make the toggle stick

#### Scenario: Operator forgets to enable App Sleeping

- **WHEN** an operator deploys both services without enabling
  App Sleeping
- **THEN** the service runs continuously and incurs Railway
  compute charges for the full uptime
- **AND** the SKILL's "Known limitations" section documents
  this as a per-service dashboard step that cannot be enforced
  by config-as-code

### Requirement: The Railway target MUST document its known limitations

The Railway deploy artifacts SHALL each document the known
limitations of the release-1 Railway target listed in the
"Limitations" bullets below. The artifacts are: the SKILL at
`.cursor/skills/railway-deploy/SKILL.md`, the cursor command at
`.cursor/commands/railway-deploy.md`, and the root `README.md`
"Release 1: cloud Supabase + docker compose" section's Railway
subsection. These are scope statements, not TODOs:

- **No persistent Puppeteer cache volume** on the Railway free
  tier — the api service re-downloads Chromium (~181 MiB) on
  every cold start from App Sleeping (and on every fresh
  deploy). Operators on a paid plan can attach a Railway
  volume at `/root/.cache/puppeteer`; the SKILL documents the
  path.
- **No preview / ephemeral environments per pull request** —
  the Railway target deploys the linked branch only. Preview
  environments are a follow-on release-1 change.
- **Public-URL handshake** — the two services communicate over
  the public internet (or, on paid plans, over a Railway private
  network), not over a docker compose bridge network. The
  generator's `--target railway` bakes the production custom
  domains (`app.resubuild.dev`, `api.resubuild.dev`) into the
  four public-URL keys accordingly. The operator MUST attach
  the matching custom domains to each service in the Railway
  dashboard (one-time setup) for those values to resolve.
- **App Sleeping is a per-service dashboard toggle, not a
  `railway.json` field.** The deploy artifacts document the
  toggle in Step 4d of the SKILL; it is not enforced by
  config-as-code. Operators MUST enable it manually per service
  or the service will not scale to zero.

#### Scenario: Operator reads the limitations before deploying

- **WHEN** an operator opens the SKILL or the README's Railway
  subsection
- **THEN** the known limitations are visible without scrolling
  past the steps
- **AND** the limitations are written as scope statements, not
  as "TODO" items
