## ADDED Requirements

### Requirement: The root scripts SHALL include a Railway deploy preflight wrapper

The repository root `package.json` MUST expose a
`pnpm deploy:railway` script. The script MUST be a thin
wrapper that:

1. Validates that `.env.prod` exists at the repo root and
   contains every required key listed in
   `openspec/specs/prod-env-bootstrap-helper/spec.md` (the
   same set the docker compose target consumes). The
   validation reuses `scripts/lib/env-prod-schema.mjs`'s
   manifest validator — the script does not duplicate the
   validation logic.
2. Exits non-zero with a one-line error when the
   validation fails (naming the missing or invalid keys).
3. On success, prints two lines: one describing the api
   service deploy (`railway up --service api`) and one
   describing the web service deploy
   (`railway up --service web`). The script does NOT
   invoke `railway up` itself — the operator runs the
   commands interactively so they can watch the build log
   and respond to any platform prompts.

The `pnpm deploy:railway` script MUST NOT be included in
`pnpm verify` or `pnpm test` (it is a deploy-time
preflight, not a quality gate).

#### Scenario: Operator runs the preflight before deploying

- **WHEN** an operator runs `pnpm deploy:railway` from
  the repo root with a valid `.env.prod` present
- **THEN** the script prints the two `railway up` commands
  and exits zero
- **AND** does not start a deploy

#### Scenario: Operator runs the preflight without `.env.prod`

- **WHEN** an operator runs `pnpm deploy:railway` from the
  repo root and `.env.prod` is missing or invalid
- **THEN** the script exits non-zero with a one-line error
  naming the missing or invalid keys
- **AND** prints a one-line note pointing at
  `pnpm setup:env:prod --target railway --from
prod-secrets.json` as the fix
- **AND** does not print the `railway up` commands (the
  preflight failed)

### Requirement: The repository SHALL ship Railway deployment config files for both services

The repository MUST contain:

- **`railway.json` at each service's root directory** (one
  per service, two total: `apps/api/railway.json` and
  `apps/web/railway.json`) — JSON config consumed by the
  Railway CLI to determine the build, the start command,
  and the healthcheck for each service. The api service's
  `railway.json` MUST pin the build to its service-local
  `Dockerfile` and the start command to
  `node apps/api/dist/main`. The web service's
  `railway.json` MUST pin the build to its service-local
  `Dockerfile` and the start command to
  `pnpm --filter @resubuild/web start`. Both MUST
  declare a `healthcheckPath` (`/_health` for the api
  service, `/` for the web service).
- **`.railwayignore` at the repo root** — a
  `.dockerignore`-style file at the repo root that excludes
  `node_modules`, `.turbo`, `.next`, `.git`, `coverage`, and
  `**/dist` from the Railway build context.

The deployable shape (Dockerfile + co-located
`railway.json` + repo-root `.railwayignore`) MUST stay in
lockstep with the docker compose target. A rename of
`apps/api/Dockerfile` to anything other than `Dockerfile` MUST
require an update to `apps/api/railway.json`'s
`build.dockerfilePath` (the path is resolved relative to the
service root directory `apps/api/`). The same applies to the
web service and `apps/web/`. The unit test
`scripts/lib/railway-config.spec.mjs` (a new colocated
test under `scripts/lib/`) MUST verify the shape of both
`railway.json` files and MUST be wired into the root
`pnpm test` pipeline.

#### Scenario: CI catches a `railway.json` shape regression

- **WHEN** a developer removes the `healthcheckPath` field
  from one of the `railway.json` files in a PR
- **THEN** the unit test in
  `scripts/lib/railway-config.spec.mjs` fails on the PR's
  CI run
- **AND** the failure message names the file and the
  missing field
- **AND** the developer fixes the regression before the PR
  can be merged

#### Scenario: `.railway/` directory is gitignored

- **WHEN** the Railway CLI writes its local metadata
  (`.railway/config.json`, `.railway/environment.json`,
  etc.) to the repo root after `railway link` runs
- **THEN** `.gitignore` includes a `.railway/` entry so
  the local metadata never enters version control
- **AND** `git status` does not surface the directory after
  a successful `railway link`

### Requirement: The `.gitignore` SHALL exclude Railway and prod env artifacts

The root `.gitignore` MUST list `.railway/`, `.env.prod`,
and `prod-secrets.json` (the latter two are already listed
by the `prod-env-bootstrap-helper` change — they are
re-asserted here so an operator auditing `.gitignore`
sees the full set of deploy-time machine-local artifacts
in one place). The entries MUST be alphabetically
ordered within their group, with a short comment grouping
them with the other machine-local artifacts.

#### Scenario: Operator audits `.gitignore` for deploy-time secrets

- **WHEN** an operator opens `.gitignore` and searches for
  deploy-related entries
- **THEN** the three entries (`.railway/`, `.env.prod`,
  `prod-secrets.json`) are visible in a single contiguous
  block
- **AND** each entry is followed by a short comment
  explaining what it covers
