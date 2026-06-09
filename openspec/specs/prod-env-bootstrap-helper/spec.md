# prod-env-bootstrap-helper

## Purpose

Define a deterministic generator (`pnpm setup:env:prod`) that writes a single `.env.prod` file for the release-1 docker compose stack targeting a cloud Supabase project. The generator is usable interactively, driven by a JSON manifest, or via LLM agent (SKILL + cursor command) without secret values touching the chat transcript.

## Requirements

### Requirement: The repository SHALL ship a deterministic generator for the release-1 production environment file

The repository MUST provide a `pnpm setup:env:prod` script (root
`package.json` script delegating to a Node ESM module under
`scripts/setup-prod-env.mjs`) that writes a single
`.env.prod` file at the repository root. The generated file MUST
contain every environment variable consumed by the release-1
docker compose stack (`apps/web` + `apps/api`) when pointed at a
non-self-hosted Supabase project, with the values grouped by
service (api, web) and a short `# description` comment per
variable. The script MUST be a pure I/O shell over a sibling
schema module at `scripts/lib/env-prod-schema.mjs` that exports
`parseManifest`, `validateManifest`, and `serializeToDotenv` so
the SKILL, the cursor command, and the script all share one
source of truth for the manifest contract.

#### Scenario: Operator runs the generator interactively

- **WHEN** an operator runs `pnpm setup:env:prod` from the repo
  root on a clean checkout
- **THEN** the script prompts for every required variable
  (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_BUCKET`,
  `MCP_EXPORT_BUCKET`, `CORS_ORIGIN`, `APP_URL`,
  `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`, and any optional
  variable the operator chooses to set)
- **AND** it auto-generates `AI_AGENT_ENCRYPTION_KEY` with
  `node:crypto.randomBytes(32).toString('base64')` when the
  operator does not supply one
- **AND** it writes a UTF-8 file with LF line endings to
  `.env.prod` next to `docker-compose.prod.yml`
- **AND** the script exits non-zero with a clear error if any
  required variable is the literal placeholder
  `change-me-to-a-long-random-secret`

#### Scenario: Operator drives the generator from a JSON manifest

- **WHEN** an operator (or an LLM agent) runs
  `pnpm setup:env:prod --from prod-secrets.json` and the
  manifest contains every required key with non-placeholder
  values
- **THEN** the script does not prompt
- **AND** it writes the same `.env.prod` shape it would have
  written interactively
- **AND** missing required keys cause the script to exit
  non-zero with a list of missing keys (no partial file is
  written)

#### Scenario: Operator previews the would-be file with `--dry-run`

- **WHEN** an operator runs
  `pnpm setup:env:prod --dry-run` (with or without `--from`)
- **THEN** the script prints the would-be `.env.prod` to stdout
- **AND** does not write to disk
- **AND** exits zero on a valid manifest and non-zero on a
  validation error

#### Scenario: Manifest schema drift is caught by a unit test

- **WHEN** a developer adds a new `KEY=value` line to
  `apps/api/.env.example` or `apps/web/.env.example` and forgets
  to add the matching entry to `scripts/lib/env-prod-schema.mjs`
- **THEN** the unit test
  `scripts/lib/env-prod-schema.spec.mjs` (run via
  `pnpm --filter . test` or the root `pnpm test`) MUST fail with
  a message that names the missing key
- **AND** the failure is the signal to update the schema module

### Requirement: The generator SHALL support a non-interactive mode and a placeholder guard

The script MUST accept a `--from <path>` flag that reads a JSON
manifest and a `--force` flag that overrides the placeholder
check. The default placeholder check MUST refuse to write
`AI_AGENT_ENCRYPTION_KEY=change-me-to-a-long-random-secret`
(anywhere in the manifest or the example) and MUST exit non-zero
with a one-line error naming the offending variable. The script
MUST also accept a `--output <path>` flag that defaults to
`./.env.prod` at the repo root and writes the file atomically
(write to `<path>.tmp` then `fs.renameSync`).

#### Scenario: Operator forces an override of the placeholder check

- **WHEN** an operator runs
  `pnpm setup:env:prod --from prod-secrets.json --force` and the
  manifest still contains the literal placeholder
- **THEN** the script writes the file anyway
- **AND** prints a one-line warning to stderr naming the
  overridden variable

#### Scenario: Operator changes the output path

- **WHEN** an operator runs
  `pnpm setup:env:prod --from prod-secrets.json --output
/etc/resubuild/.env.prod`
- **THEN** the script writes to that absolute path
- **AND** refuses to follow a symlink (it opens the destination
  with `O_NOFOLLOW` semantics via `fs.openSync(path,
'wx')`)

### Requirement: Generated artifacts and intermediate manifests SHALL be gitignored

The repository's `.gitignore` MUST list `.env.prod` and
`prod-secrets.json` so neither the generated env file nor the
JSON manifest an operator hands the script ever enters version
control. The script MUST refuse to write a `.env.prod` whose
path resolves to a file already tracked by `git ls-files`
(checked via `git ls-files --error-unmatch <path>` at the start
of the write step) and exit non-zero with a one-line error.

#### Scenario: Operator accidentally runs the script inside a tracked `.env.prod`

- **WHEN** an operator runs `pnpm setup:env:prod` and the
  destination `.env.prod` is already tracked by git
- **THEN** the script exits non-zero with
  `error: <path> is tracked by git; remove it from the index
first (see openspec/specs/prod-env-bootstrap-helper)`
- **AND** does not modify the file

### Requirement: The release-1 docker compose target SHALL be defined in `docker-compose.prod.yml`

The repository MUST contain a `docker-compose.prod.yml` at the
repo root that declares the release-1 services (`web`, `api`)
plus a shared bridge network. Both services MUST read
`env_file: .env.prod` and MUST NOT hardcode secrets. The
`api` service MUST additionally mount a named volume
(`resubuild-puppeteer-cache`) at the path the api image
expects for Puppeteer's browser cache, so Puppeteer does not
re-download Chromium on every container restart. The compose
file MUST contain a header comment that documents the
intentionally minimal scope (no TLS, no reverse proxy, no
registry push) and points at sibling release-1 changes for
those concerns.

#### Scenario: Operator brings up the release-1 stack

- **WHEN** an operator runs
  `docker compose -f docker-compose.prod.yml --env-file .env.prod
config` after a successful `pnpm setup:env:prod`
- **THEN** the command exits zero
- **AND** the resolved config shows `web` and `api` services
  reading from `.env.prod`
- **AND** no secret values are echoed (docker compose prints
  the env keys, not their values, in `config` output)

#### Scenario: Operator brings up the release-1 stack with a stale `.env.prod`

- **WHEN** an operator runs
  `docker compose -f docker-compose.prod.yml up` without a
  `.env.prod` at the repo root
- **THEN** docker compose exits non-zero with a clear
  "env file not found" error
- **AND** the README's Release 1 section names
  `pnpm setup:env:prod` as the prerequisite

### Requirement: An LLM agent SHALL be able to drive the generator without seeing raw secret values

The repository MUST provide a `.cursor/skills/setup-prod-env/SKILL.md`
plus a `.cursor/commands/setup-prod-env.md` cursor command
(invoked as `/opsx:setup-prod-env`) that wrap the script for
LLM agents. Both MUST walk the operator through the same set
of variables the script does, MUST write the manifest to
`prod-secrets.json` on disk, and MUST invoke the script with
`--from <manifest>` so the secret values never round-trip
through the chat. The SKILL's `## Guardrails` section MUST
explicitly forbid echoing a secret value back to the user and
MUST treat the manifest file as the only safe place for secret
material.

#### Scenario: Agent drives the generator end-to-end

- **WHEN** an LLM agent (Cursor or Claude Code) runs
  `/opsx:setup-prod-env`
- **THEN** the command writes a `prod-secrets.json` manifest
  under the workspace root
- **AND** invokes `pnpm setup:env:prod --from
prod-secrets.json --dry-run` first
- **AND** only on operator confirmation invokes the script
  again without `--dry-run` to write `.env.prod`
- **AND** the chat transcript does not contain any of the
  secret-shaped values from the manifest

#### Scenario: Skill refuses to paste secrets into chat

- **WHEN** an LLM agent loads `.cursor/skills/setup-prod-env/SKILL.md`
  and is asked by the user "what is my `SUPABASE_SERVICE_ROLE_KEY`?"
- **THEN** the SKILL's guardrails direct the agent to answer
  with the path to `prod-secrets.json` and refuse to read or
  echo the file's contents
- **AND** the chat transcript does not contain the secret value

### Requirement: The README SHALL document the release-1 deployment flow

The root `README.md` MUST contain a \*\*Release 1: cloud Supabase

- docker compose** section that links to the script, the SKILL,
  the cursor command, and `docker-compose.prod.yml`, and lists
  the env vars the operator should pre-gather from the Supabase
  dashboard. The section MUST be ordered as: (1) collect
  credentials, (2) run `pnpm setup:env:prod`, (3) bring up the
  stack with `docker compose -f docker-compose.prod.yml up`. The
  section MUST NOT duplicate the local-development walkthrough
  in the existing **Local development (Supabase CLI)\*\* section;
  it points back to that section for the `supabase link` /
  `supabase db push` step that runs the migrations against the
  cloud project.

#### Scenario: Operator follows the README to first deploy

- **WHEN** an operator reads the root `README.md` and searches
  for "Release 1" or "production"
- **THEN** they find the **Release 1: cloud Supabase + docker
  compose** section
- **AND** the section names every env var the generator
  prompts for
- **AND** the section links to the SKILL and the cursor command
  for the LLM-driven flow
- **AND** the section explicitly says it is the minimum viable
  prod target and links to the follow-on release-1 work for
  TLS, reverse proxy, and registry push

### Requirement: The generator SHALL accept a `--target` flag that bakes the production custom domains for the Railway target

The `pnpm setup:env:prod` script MUST accept a
`--target <name>` flag. The accepted values are
`docker-compose` (the default, preserving the existing
behavior) and `railway`. When the operator passes
`--target railway`, the script writes the four public-URL
keys (`CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL`,
`NEXT_PUBLIC_API_URL`) with the **production custom domains**
as defaults — `CORS_ORIGIN` and `APP_URL` get
`https://app.resubuild.dev`, `PUBLIC_API_URL` and
`NEXT_PUBLIC_API_URL` get `https://api.resubuild.dev` — so the
generated `.env.prod` is immediately deployable as long as
the operator has attached the matching custom domains to the
corresponding Railway services. The script MUST print a
one-line reminder to stdout that points the operator at the
two dashboard steps (custom-domain attachment + App Sleeping
toggle) that the generator cannot encode. The manifest
always wins: any of the four public-URL keys the operator
supplies in `prod-secrets.json` overrides the Railway target
default for that key. The default target (`docker-compose`)
MUST NOT change — the existing localhost placeholders are
preserved verbatim so the docker compose target is unaffected.

#### Scenario: Operator generates `.env.prod` for the Railway target from a manifest

- **WHEN** an operator runs
  `pnpm setup:env:prod --target railway --from
prod-secrets.json` with a manifest that supplies every
  required key
- **THEN** the script writes `.env.prod` with
  `CORS_ORIGIN` and `APP_URL` set to `https://app.resubuild.dev`
  and `PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` set to
  `https://api.resubuild.dev` (assuming the manifest left the
  four keys empty)
- **AND** the script prints a one-line note to stdout
  reminding the operator to (a) attach the two custom domains
  in the Railway dashboard and (b) enable App Sleeping on
  each service
- **AND** the script does not write a `.env.prod` that mixes
  docker compose placeholders (`http://localhost:*`) with
  Railway custom domains in the four public-URL keys

#### Scenario: Operator supplies manifest values for the four public-URL keys

- **WHEN** an operator's `prod-secrets.json` sets
  `CORS_ORIGIN: "https://my.example.com"` and the script is
  run with `--target railway`
- **THEN** the manifest value wins and the output contains
  `CORS_ORIGIN=https://my.example.com` (not the
  `app.resubuild.dev` default)
- **AND** the other three public-URL keys still default to
  the production custom domains

#### Scenario: Operator omits `--target` and gets the docker compose placeholders

- **WHEN** an operator runs
  `pnpm setup:env:prod --from prod-secrets.json` (no
  `--target` flag, or `--target docker-compose`)
- **THEN** the script writes the same `.env.prod` it would
  have written before this requirement was added — the
  docker compose placeholders are unchanged
- **AND** no Railway reminder is printed
- **AND** no `resubuild.dev` domain appears in the generated
  file

#### Scenario: Manifest declares `DEPLOY_TARGET` explicitly

- **WHEN** an operator's `prod-secrets.json` contains
  `DEPLOY_TARGET: "railway"` and the script is run with
  `--target docker-compose` (or no `--target` flag)
- **THEN** the manifest's `DEPLOY_TARGET` takes precedence
  over the CLI flag and the production custom domains are
  written into the four public-URL keys
- **AND** a one-line warning is printed noting the
  discrepancy between the CLI flag and the manifest
- **AND** a manifest `DEPLOY_TARGET` value that does not
  match any known target causes the script to exit non-zero
  with a one-line error listing the supported targets

### Requirement: The schema module SHALL declare the new `DEPLOY_TARGET` key without breaking the drift test

`scripts/lib/env-prod-schema.mjs` MUST declare the new
optional `DEPLOY_TARGET` key alongside the existing optional
keys. The drift test
(`scripts/lib/env-prod-schema.spec.mjs`) that reads
`apps/api/.env.example` and `apps/web/.env.example` MUST stay
green — `DEPLOY_TARGET` is a generator-internal key, not an
api/web runtime key, so it MUST NOT appear in either
`.env.example` file. The schema MUST validate the
`DEPLOY_TARGET` value against the closed set
`["docker-compose", "railway"]` and reject any other value.

#### Scenario: Operator supplies a bogus `DEPLOY_TARGET` in the manifest

- **WHEN** an operator's `prod-secrets.json` contains
  `DEPLOY_TARGET: "vercel"` and the script is run
- **THEN** the script exits non-zero with a one-line error
  listing the supported targets
- **AND** no file is written to disk

#### Scenario: Schema drift test stays green with the new key

- **WHEN** `pnpm test` runs the schema unit tests after
  `DEPLOY_TARGET` is added to the schema module
- **THEN** the drift test against the two `.env.example`
  files passes
- **AND** the manifest-validation test covers the
  `DEPLOY_TARGET` happy path and the unknown-value
  rejection path
