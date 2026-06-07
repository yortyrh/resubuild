# Resubuild

Monorepo for managing CVs with **Next.js** (UI), **NestJS** (REST API + authentication + schema validation), and **Supabase Postgres** (RLS-protected storage). Auth is **API-issued Bearer tokens** (JSON over CORS)—the web bundle does **not** embed Supabase client libraries.

## Stack

- **apps/web** — Next.js App Router, shadcn-style UI, token session in `sessionStorage`, calls Nest at `NEXT_PUBLIC_API_URL`
- **apps/api** — NestJS REST API, `/auth/*` issuance + JWT guard, AJV validation against [JSON Resume schema](https://raw.githubusercontent.com/jsonresume/resume-schema/refs/heads/master/schema.json)
- **apps/import-agent** — Mastra PDF import workflow and reusable verification tools
- **packages/schemas** — official resume JSON schema
- **packages/types** — shared TypeScript resume types
- **packages/resume-template** — MIT-format HTML renderer for preview and PDF export
- **packages/import-models** — pinned Mastra provider/model catalog for PDF import settings
- **supabase/migrations** — `cv` table + RLS policies

## Prerequisites

- Node.js 20+
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

## Local development (Supabase CLI)

For day-to-day work on your machine, use the local Supabase stack and the seed script. No cloud project required.

### Setup

From the repo root:

```bash
pnpm install
supabase start
pnpm setup:env      # writes apps/api/.env and apps/web/.env (Supabase + PDF import defaults)
pnpm samples:seed   # creates dev + E2E accounts, sample CVs, and media (no API needed)
```

On first seed, **unique passwords are generated for your machine** and saved to `.samples/local-credentials.json` (gitignored). The seed prints them to the terminal. To show them again later:

```bash
pnpm local:credentials
```

**Developer sign-in** (use this in the browser):

- Email: `developer@resubuild.local`
- Password: run `pnpm local:credentials` (not committed to git)

### Run the app

```bash
pnpm dev            # web :3000 + api :3001
```

Open http://localhost:3000, sign in with the developer account, and you should see 10 sample CVs on the dashboard.

### CV preview and PDF export

From any CV editor, use **Preview** to open `/dashboard/cv/[id]/preview` — a print-faithful MIT-format HTML view of the assembled resume (experience before education, ruled section headings). **Print** uses the browser; **Download PDF** calls `GET /cv/:id/export/pdf` on the API.

PDF generation uses headless Chromium (Puppeteer) in `apps/api`. For local dev, Puppeteer downloads its own browser. In production Docker, set `CHROMIUM_EXECUTABLE_PATH` to a system Chromium binary if the bundled browser is unavailable. HTML preview works without Chromium; PDF returns `503` when launch fails.

Regenerate sample PDFs from JSON fixtures: `pnpm samples:pdf` (builds `@resubuild/resume-template` first).

### PDF import smoke (optional)

Requires a real provider API key in AI agent settings. `pnpm setup:env` generates `AI_AGENT_ENCRYPTION_KEY`. Optional Tavily or Firecrawl keys for URL import and web lookup are saved per user in the app (Settings → AI agent), not in server env.

1. Open `/dashboard/settings/import-llm`, pick provider → model → API key, and save.
2. Generate sample PDFs if needed: `pnpm samples:pdf`
3. On `/dashboard/cv/new`, use **Import PDF** with a file from `.samples/resumes/pdf/`.
4. Wait for the job to finish and confirm the editor shows extracted sections.

Manual checks:

- Invalid model id → settings save error, PDF import stays gated.
- Valid model + bad API key → `422`, PDF import stays disabled.
- Non-PDF or oversize upload → client/API error, no CV created.

### Optional — verify the stack

E2E tests boot Nest in-process (no separate `pnpm dev:api` needed) and use the dedicated E2E account from `local-credentials.json`:

```bash
pnpm test:e2e       # 11 integration tests against local Supabase
```

Re-run `pnpm samples:seed` after resetting Supabase (`supabase db reset`) or to refresh sample data. Passwords stay the same unless you delete `.samples/local-credentials.json`.

---

## Cloud Supabase setup

For deployment or a shared remote database:

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Email** auth (Authentication → Providers).
3. Apply the database migration (creates `public.cv`, RLS policies, and triggers).

**Recommended — Supabase CLI**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`<your-project-ref>` is the ID in your project URL: `https://<project-ref>.supabase.co`.

**Alternative — SQL editor**

Paste and run migrations from `supabase/migrations/` in Supabase → **SQL Editor**.

---

## Release 1: cloud Supabase + docker compose

Deploy the system to a production docker compose stack connected to a non-self-hosted (cloud) Supabase project.

> **Minimum viable target.** This release ships without TLS, a reverse proxy, or a container registry push. Those concerns are addressed by follow-on release-1 changes. See [openspec/specs/prod-env-bootstrap-helper/spec.md](openspec/specs/prod-env-bootstrap-helper/spec.md) for the full scope.

### Prerequisites

Before starting, you need from your Supabase dashboard:

- **Supabase project URL** → Project Settings → API → "Project URL"
- **Supabase anon key** → Project Settings → API → "anon / public" key
- **Supabase service role key** → Project Settings → API → "service_role" key (**treat as server-only**)
- **Two Storage buckets** named `media` and `mcp-exports` (create them under Storage in the Supabase dashboard)
- **Public URL** for this deployment (e.g., `https://app.example.com`)

The `supabase link` / `supabase db push` step from the **Cloud Supabase setup** section above is also required to apply migrations to your cloud project.

### Step 1 — Generate `.env.prod`

From the repo root:

```bash
pnpm setup:env:prod
```

The script prompts for all required variables and auto-generates an `AI_AGENT_ENCRYPTION_KEY` if you don't supply one.

**LLM agent flow:** Use the `/opsx:setup-prod-env` command or load the [`.cursor/skills/setup-prod-env/SKILL.md`](.cursor/skills/setup-prod-env/SKILL.md) to drive the generator as an agent. Both write a `prod-secrets.json` manifest to disk (gitignored) and invoke the script via `--from` so secret values never appear in chat.

**Dry-run preview:**

```bash
pnpm setup:env:prod:dry-run --from prod-secrets.json
```

### Step 2 — Verify docker compose

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod config
```

### Step 3 — Bring up the stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up
```

Both services (`web`, `api`) read from `.env.prod`. The `api` service mounts a named volume (`resubuild-puppeteer-cache`) so Chromium is not re-downloaded on every container restart.

### Files

| File                                                                                                   | Purpose                                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [`scripts/setup-prod-env.mjs`](scripts/setup-prod-env.mjs)                                             | Script engine                                           |
| [`scripts/lib/env-prod-schema.mjs`](scripts/lib/env-prod-schema.mjs)                                   | Schema module (shared by script, SKILL, cursor command) |
| [`docker-compose.prod.yml`](docker-compose.prod.yml)                                                   | Compose definition                                      |
| [`.cursor/skills/setup-prod-env/SKILL.md`](.cursor/skills/setup-prod-env/SKILL.md)                     | LLM agent workflow                                      |
| [`.cursor/commands/setup-prod-env.md`](.cursor/commands/setup-prod-env.md)                             | Cursor command (`/opsx:setup-prod-env`)                 |
| [`openspec/specs/prod-env-bootstrap-helper/spec.md`](openspec/specs/prod-env-bootstrap-helper/spec.md) | Full spec                                               |

Collect from **Project Settings → API**:

- Project URL → **`SUPABASE_URL`**
- anon public key → **`SUPABASE_ANON_KEY`**

Then configure env files:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

## Quality checks

From the repo root:

- **`pnpm format`** / **`pnpm format:check`** — Prettier
- **`pnpm lint`** / **`pnpm lint:fix`** — Biome
- **`pnpm typecheck`** — TypeScript across all packages
- **`pnpm verify`** — full CI pipeline locally (Prettier, Biome, typecheck, unit tests, build)
- **`pnpm test`** — unit tests (Vitest + Jest)
- **`pnpm test:e2e`** — integration tests against local Supabase (requires setup above)
- **`pnpm local:credentials`** — show local dev and E2E login details for this machine

Git hooks (Lefthook): **pre-commit** (Biome + Prettier on staged files), **pre-push** (`pnpm verify`).

### Toolchain memory budget

The verify pipeline caps parallelism to keep peak memory under ~4 GB per process
on constrained environments (CI runners, laptops). Defaults:

| Tool                                     | Default cap                                   |
| ---------------------------------------- | --------------------------------------------- |
| Jest (`apps/api` unit tests)             | `--maxWorkers=2`                              |
| Vitest (all workspaces)                  | `singleFork: true` (one fork)                 |
| Turborepo (`test`, `build`, `typecheck`) | `concurrency: 2`                              |
| Prettier (`pnpm format`, `format:check`) | `--concurrency=2`                             |
| Biome                                    | unchanged (~250 MB peak)                      |
| GitHub Actions CI                        | 2 parallel jobs (`quality`, `test-and-build`) |

To raise the cap on a larger machine, set the `RESUME_PARALLELISM` env var:

```bash
RESUME_PARALLELISM=8 pnpm verify   # 8 workers/forks for Jest, Vitest, Turborepo, Prettier
```

`RESUME_PARALLELISM` is not honored by Biome or GitHub Actions CI (those always
use the conservative defaults).

## Troubleshooting

| Error                                                      | Fix                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Could not find the table 'public.cv' in the schema cache` | Run `supabase db push` or `supabase start` with migrations applied.                                   |
| `Invalid or expired token`                                 | Sign out and sign in again. Ensure `SUPABASE_*` vars in `apps/api/.env` match your Supabase instance. |
| Forgot local dev password                                  | Run `pnpm local:credentials`.                                                                         |
| `pnpm verify` fails on Node version                        | Use Node **22** (see `.nvmrc`). CI uses 22; newer Node can hide test failures that break in CI.       |

## Debugging the API

See [`apps/api/README.md`](apps/api/README.md#debugging-the-api) for the full guide covering `pnpm dev:api:debug`, the VS Code / Cursor launch configuration, `pnpm local:devtools`, and the `inspector-mcp` option for agent debugging.

## API (`apps/api`)

Authenticate with Bearer tokens from **`POST /auth/login`** / **`POST /auth/register`**. The UI stores tokens in **`sessionStorage`**.

| Method | Path                                       | Description                                             |
| ------ | ------------------------------------------ | ------------------------------------------------------- |
| GET    | `/cv`                                      | List user's CVs                                         |
| GET    | `/cv/:id`                                  | Get one CV                                              |
| POST   | `/cv`                                      | Create `{ title?, data }`                               |
| PATCH  | `/cv/:id`                                  | Update `{ title?, data? }`                              |
| DELETE | `/cv/:id`                                  | Delete CV                                               |
| GET    | `/cv/:id/export/html`                      | Full MIT-format HTML document (auth)                    |
| GET    | `/cv/:id/export/pdf`                       | PDF bytes (`Content-Disposition` attachment)            |
| GET    | `/cv/:id/export/json`                      | JSON Resume download (`Content-Disposition` attachment) |
| GET    | `/import/llm/providers`                    | List PDF import LLM providers                           |
| GET    | `/import/llm/providers/:providerId/models` | List models for a provider                              |
| GET    | `/import/llm/config`                       | Current user's import LLM settings                      |
| PUT    | `/import/llm/config`                       | Save provider/model/API key                             |
| POST   | `/cv/import/pdf`                           | Start async PDF import (`202`, `{ jobId }`)             |
| GET    | `/cv/import/:jobId`                        | Poll PDF import job status                              |

## Security

- Row Level Security on `public.cv`: users only access their own rows (`auth.uid() = user_id`).
- Nest validates Supabase access tokens via `auth.getUser()` and forwards the user token to Supabase so RLS applies.

## Project structure

```
apps/
  api/          NestJS REST API
  import-agent/ Mastra PDF import workflow
  web/          Next.js frontend
packages/
  import-models/ pinned Mastra provider/model catalog
  resume-template/ MIT HTML renderer for preview/PDF export
  schemas/      resume.schema.json
  types/        shared Resume types
supabase/
  migrations/   database schema
.samples/       seed fixture (CVs, media, local credentials)
```
