# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Questions-only mode ("q:")

A message that starts with `q:` is a question only. Answer it, but change nothing: no file edits, no commits, no migrations, no installs, no data or infra changes. Reading files and running read-only commands is fine. If the answer suggests a change, describe it and wait for a separate request.

## Commits

Every commit must be made with the `commit` skill (`.claude/skills/commit/SKILL.md`), which holds all the commit rules (message format, no co-authorship, tests and code in separate commits). Invoke it before running `git commit`.

## Tooling first: generate with commands, then edit

Important project rule: for any action that an installed tool can do, run the tool's command first and then edit the generated result. Do not write that output yourself token by token.

- **Why:** standardize repeatable processes through scripts, and spend tokens on reading and adjusting generated code, not on producing boilerplate as LLM output.
- **Scope:** any tool, whether installed in the project's npm dependencies (run via `pnpm exec` / `pnpm --filter <pkg> exec`) or installed on the machine. This covers scaffolding, migrations, icons, formatting, dependency changes, env files, etc.
- **Order of work:** (1) check whether a tool or `package.json` script covers the task (`pnpm run`, `--help`, existing `scripts/`), (2) run it, (3) modify only what the generated output does not already do, (4) if no tool covers it, write it by hand.
- **Generated output follows the other rules here:** use `--no-spec` style flags so generators do not create tests; tests come from the test agent (see below). Commit generated files like any other change, and never hand-edit generated artifacts that a command will overwrite (e.g. applied migrations).

Known commands in this repo:

| Task                                                    | Command                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| NestJS module, controller, service, etc. (`apps/api`)   | `pnpm --filter @resubuild/api exec nest g <schematic> <name> --no-spec`                           |
| DB migration after editing `packages/db/src/schema`     | `pnpm db:generate`                                                                                |
| Icons                                                   | `pnpm icons:generate`                                                                             |
| Landing hero demo GIF / still poster (`apps/hero-demo`) | `pnpm --filter @resubuild/hero-demo render:gif`, `render:poster`; preview with `... studio`       |
| Lint / format fixes                                     | `pnpm lint:fix`, `pnpm format`                                                                    |
| Local / prod env files                                  | `pnpm setup:env`, `pnpm setup:env:prod`                                                           |
| Dependencies                                            | `pnpm add` / `pnpm remove`, never by editing `package.json` and the lockfile by hand              |
| UI components (`apps/web`)                              | `shadcn` CLI, only once the web app is initialized with it (`components.json` does not exist yet) |

When a new generator or script is added to the repo, add it to this table.

## Tests, agents and mutation testing

### Tests and code go in separate commits

- Unit tests are always committed separately from the code they cover: the test commit (`test(...)`) comes first, the implementation commit (`feat`/`fix`/`refactor`...) after it. Never mix tests and production code in one commit.

### Separate agents for tests and code

- A single agent never writes both the unit tests and the production code of the same change. Each agent that takes a change works on **either** the tests **or** the code, never both.
- Why: an agent that owns both will tend to bend the tests until they pass against whatever the code does. Splitting the roles keeps the tests an independent statement of expected behavior, which protects code quality and the stability of the app.
- Test agent: writes tests from the requirement (`docs/requirements/<area>.md`) and the public interface, not from the implementation. Code agent: makes the committed tests pass and must not edit them. If a test looks wrong, report it back instead of changing it.

### Mutation testing

**Current status: Stryker is NOT installed in this repo, so do not run or install it for now.** Do not add the dependency, configs or a `pnpm mutate` script unless the user explicitly asks. Until then, follow the Stryker Mutator ideas described below by hand: for every change, review the tests as if mutants were applied (boundaries, negated conditions, removed guards, swapped operators, unchecked return values) and add or strengthen tests so each of those faults would make a test fail. Once Stryker is installed, run it as described in the workflow.

The practice: whenever new changes are made to the app (new features, behavior changes, fixes), apply mutation testing scoped to the code touched, before considering the work done.

**What it is.** Mutation testing measures how good the tests are, not just how much code they execute. The tool makes many copies of the source ("mutants"), each with one small deliberate fault (`>` to `>=`, `+` to `-`, `&&` to `||`, a condition negated, a statement or return value removed, a string emptied). The test suite is run against each mutant:

- **Killed**: at least one test fails. Good, the tests notice that behavior.
- **Survived**: all tests still pass. Bad, a real bug of that shape would go unnoticed: a missing test or a weak assertion.
- **No coverage**: no test executes that code at all.
- **Timeout / error**: counted as detected (killed) in most tools. The mutant broke the code badly enough that the run hung or crashed.
- **Equivalent mutant**: a change that does not alter observable behavior, so it cannot be killed. Do not chase these; justify and ignore them.

**Mutation score** = killed ÷ total valid mutants × 100. Line coverage can be 100% with weak assertions; the mutation score exposes that. Targets: aim for ≥ 80% on the code you changed; below ~70% there are significant test gaps. Do not chase 100%, because of equivalent mutants and diminishing returns. It complements coverage and review; it is not the only quality metric.

**Workflow for every change.**

1. The test agent writes the tests first and commits them (see above).
2. The code agent implements the change.
3. (Only once Stryker is installed; until then do the manual mutant review described above.) Run mutation testing on the touched files only (mutation runs are slow; never run the whole repo by default). Use the tool for the stack: [StrykerJS](https://stryker-mutator.io/docs/stryker-js/introduction/) (`@stryker-mutator/core` with `@stryker-mutator/jest-runner` for `apps/api`, `@stryker-mutator/vitest-runner` for web, import-agent and packages). Use `--mutate <glob>` to limit scope, and `--incremental` (results in `reports/stryker-incremental.json`; `--force` to rerun everything) so only changed code and tests are re-evaluated.
4. Read the report (HTML under `reports/`) and list the **surviving** and **no coverage** mutants.
5. For each survivor, decide: (a) add or strengthen a test (assert exact values and boundaries, not just "doesn't throw"), or (b) it is an equivalent/irrelevant mutant, so ignore it with a short reason. Fix survivors with new tests via the **test agent**; the code agent must not weaken tests or edit them to kill mutants.
6. Re-run until the score on the touched code meets the target, and mention the score and any justified survivors in the final report.

Common survivors to look for first: boundary conditions (`<` vs `<=`), removed guards (`user_id` filters, auth checks), negated conditions, swapped logical operators, and unchecked return values or side effects.

When the user decides to adopt Stryker, add it as its own `chore`/`build` change (dev dependency, per-package configs, a `pnpm mutate` script) and keep generated `reports/` and `.stryker-tmp/` out of git, then update this section's status.

References: [Stryker incremental mode](https://stryker-mutator.io/docs/stryker-js/incremental/), [Stryker Vitest runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/), [Mutation testing by example](https://opensource.com/article/19/9/mutation-testing-example-definition).

## Pushing

Every push must be made with the `push` skill (`.claude/skills/push/SKILL.md`), which holds all the push rules (`pnpm push` instead of `git push`, clean tree, verify, no bypassing checks). Invoke it before pushing.

## Overview

Resubuild: JSON Resume–based CV builder with AI import (PDF/DOCX/image/URL), MIT-format preview, PDF export, job-application tailoring, and an MCP server. pnpm + Turborepo monorepo, Node 26.x LTS managed by pnpm: root `package.json` `devEngines.runtime` pins the version, pnpm downloads it and runs every script with it, and `pnpm verify` enforces it via `scripts/check-node-version.mjs`. Upgrade with `pnpm runtime set node lts`, then bump `engines.node`, `.nvmrc` (editors/CI), `apps/{api,web}/Dockerfile` base images and `@types/node` together.

- `apps/web` — Next.js App Router UI. Route groups `(auth)`, `(marketing)`, `auth/` (callbacks), `dashboard/{cv,applications,templates,settings}`, `features`. Bearer session token lives in `localStorage` (`src/lib/auth-session.ts`); Better Auth endpoints go through `src/lib/auth/client.ts`, everything else through `src/lib/api.ts`, both to `NEXT_PUBLIC_API_URL`. Server-state hooks in `src/lib/queries`.
- `apps/api` — NestJS 11 REST API (port 3001). Feature modules under `src/`: `auth` (Better Auth at `/api/auth/*`, `SessionAuthGuard`, OAuth handoff), `database` (Drizzle pool, `DbScope`), `storage` (S3 `ObjectStorageService`), `mail` (SMTP `MailService`), `cv` (CRUD, items, clone, template presentation), `import` (async import jobs), `import-llm-config` / `ai-agent` (per-user LLM settings), `application` (job-application prep), `cv-export` / `export-storage` (Puppeteer PDF), `media`, `mcp` (MCP server via `@rekog/mcp-nest`, per-user API key), `validation` (AJV).
- `apps/import-agent` — Mastra workflow for resume import; consumed by `apps/api`.
- `apps/hero-demo` — Remotion project that draws the animated demo in the landing hero (a recreation of the app, not a recording). Its output (`apps/web/public/hero-demo.gif` and `hero-demo-poster.png`) is committed; re-render after UI or copy changes. Preview with `pnpm --filter @resubuild/hero-demo studio` (port 3100; there is deliberately no `dev` or `build` script, so `pnpm dev` and `pnpm build` skip it).
- `packages/db` (Drizzle schema, SQL migrations in `packages/db/migrations`, PGlite test helper `@resubuild/db/testing`), `email-templates` (React Email), `schemas` (JSON Resume schema), `types` (shared TS types), `resume-template` (HTML renderer shared by web preview and API PDF export), `import-models` (pinned Mastra provider/model catalog).
- Backing services are plain Postgres (`DATABASE_URL`), S3-compatible storage (`S3_*`) and SMTP (`SMTP_*`). Local dev runs them from `docker-compose.dev.yml`.

## Architecture notes

- **Server boundary:** the web bundle talks to the API over HTTP only. `apps/web/src/lib/web-bundle-security.test.ts` fails if web code references server secrets (`DATABASE_URL`, `S3_*`, `BETTER_AUTH_SECRET`…), imports `@resubuild/db`, `pg`, `drizzle-orm`, `@aws-sdk/*`, `nodemailer`, server `better-auth`, `@supabase/*`, or reaches into `apps/api`.
- **User isolation is in the API, not the database:** there is no RLS. Every repository query must filter by `user_id` (via `CvNormalizedRepository.scopeFor(user)` / `DbScope`, or the owning `cv`). Add a cross-user test when adding a query. Repository specs run on PGlite (`useTestDb()` in `apps/api/src/database/test-db.helpers.ts`).
- **Auth:** Better Auth inside the API (`apps/api/src/auth/better-auth.ts`), sessions in Postgres, bearer plugin (`set-auth-token` header). Optional flows are toggled by `AUTH_*_ENABLED` and `<PROVIDER>_CLIENT_ID/SECRET` in `apps/api/.env` (the source of truth; disabled flows are not served). The web mirrors them as `NEXT_PUBLIC_AUTH_*`, and `pnpm setup:env` / `setup:env:prod` derive the mirrors. OAuth starts at `GET /auth/oauth/:provider` on the API and hands the session to the SPA with a one-time code (`/auth/callback`).
- **Email:** `MailService` sends over SMTP; templates are in `packages/email-templates` (React Email). Local mail is captured by Mailpit at http://127.0.0.1:54424.
- Per-user AI settings (provider/model/API key) are stored encrypted with `AI_AGENT_ENCRYPTION_KEY` (generated by `pnpm setup:env`).
- **Env vars:** any new key in `apps/{api,web}/.env.example` must be registered in `scripts/lib/env-prod-schema.mjs` (checked by `pnpm env-schema:check`, runs in `pnpm push`). That schema also drives `pnpm setup:env:prod`.
- **Schema changes:** edit `packages/db/src/schema`, run `pnpm db:generate`, commit the SQL in `packages/db/migrations`. Deploys run `node packages/db/dist/migrate.js` before the API starts.
- **Deploy:** docker compose (`docker-compose.prod.yml`, `.env.prod`; `migrate` one-shot service, optional `selfhost` profile) or Railway (`apps/{api,web}/railway.json`, same Dockerfiles, pre-deploy migrations). Moving data off an old Supabase deployment: `pnpm migrate:from-supabase`. Details in README.
- **Product requirements:** `docs/requirements/<area>.md` (stable `REQ-<AREA>-NNN` ids, no change history; git is the history). Read only the area you touch; when behavior changes, update the matching requirement in the same commit. API E2E catalog: `apps/api/test/e2e/README.md`.
- **pnpm version** is pinned in root `package.json` (`packageManager`) and again in `apps/{api,web}/Dockerfile` (`npm install -g pnpm@…`; Node 25+ images no longer ship corepack); bump them together.

## Commands

Setup (Docker or Podman required): `pnpm install && pnpm infra:up && pnpm setup:env && pnpm samples:seed`. `pnpm infra:down` / `infra:reset` stop or wipe the stack (Postgres :54432, S3 :54490, Mailpit :54424). Dev login: `developer@resubuild.local`, password via `pnpm local:credentials`.

- `pnpm dev` — web :3000 + api :3001 (`dev:web`, `dev:api` individually)
- `pnpm verify` — full CI pipeline (format:check, biome lint, typecheck, tests, build); `pnpm push` runs it before pushing
- `pnpm lint` / `lint:fix` (Biome), `pnpm format` / `format:check` (Prettier), `pnpm typecheck`
- `pnpm test` — unit tests across workspaces (Jest in api, Vitest elsewhere) plus root script tests (`vitest.config.mjs`)
- `pnpm test:e2e` — Nest in-process integration tests; Testcontainers starts throw-away Postgres/S3/Mailpit, migrates and seeds (only Docker needed)
- `pnpm samples:pdf` — regenerate sample PDFs; `pnpm samples:seed` — re-seed after `pnpm infra:reset`
- `pnpm db:migrate` / `pnpm db:generate` — apply / create Drizzle migrations

Single tests:

- API (Jest): `pnpm --filter @resubuild/api exec jest path/to/file.spec.ts` (add `-t "name"`)
- Web / import-agent / packages (Vitest): `pnpm --filter @resubuild/web exec vitest run path/to/file.test.ts`
- Root scripts: `pnpm exec vitest run --config vitest.config.mjs scripts/lib/<file>.spec.mjs`

Workspace packages are built via turbo `^build` before dev/test/typecheck, so after editing `packages/*` or `apps/import-agent` dependents need the rebuilt output (`pnpm dev:types` watches types).

Test parallelism is deliberately capped (Jest `--maxWorkers=2`, Vitest single fork, turbo concurrency 2); raise with `RESUME_PARALLELISM=8`.

Conventions: unit tests colocated beside source. Pre-commit runs Biome + Prettier (with tailwind class sorting) on staged files.
