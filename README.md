# Resumind

Monorepo for managing CVs with **Next.js** (UI), **NestJS** (REST API + authentication + schema validation), and **Supabase Postgres** (RLS-protected storage). Auth is **API-issued Bearer tokens** (JSON over CORS)—the web bundle does **not** embed Supabase client libraries.

## Stack

- **apps/web** — Next.js App Router, shadcn-style UI, token session in `sessionStorage`, calls Nest at `NEXT_PUBLIC_API_URL`
- **apps/api** — NestJS REST API, `/auth/*` issuance + JWT guard, AJV validation against [JSON Resume schema](https://raw.githubusercontent.com/jsonresume/resume-schema/refs/heads/master/schema.json)
- **packages/schemas** — official resume JSON schema
- **packages/types** — shared TypeScript resume types
- **supabase/migrations** — `cv` table + RLS policies

## Prerequisites

- Node.js 20+
- pnpm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (recommended for migrations)
- A Supabase project (cloud or local CLI)

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Email** auth (Authentication → Providers).
3. For local dev, you can disable email confirmation: Authentication → Providers → Email → disable “Confirm email”.
4. Apply the database migration (creates `public.cv`, RLS policies, and triggers).

**Recommended — Supabase CLI**

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), log in, then from the repo root:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`<your-project-ref>` is the ID in your project URL: `https://<project-ref>.supabase.co`  
(e.g. for `https://cakaoffudwbphihxkehq.supabase.co`, use `cakaoffudwbphihxkehq`).

`db push` applies all files in `supabase/migrations/`. Re-run it after adding new migrations.

**Alternative — SQL editor**

Paste and run `supabase/migrations/20260523000000_create_cv_table.sql` in Supabase → **SQL Editor**.

**Alternative — psql**

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260523000000_create_cv_table.sql
```

5. Collect from **Project Settings → API**:
   - Project URL → **`SUPABASE_URL`** (Nest only)
   - anon public key → **`SUPABASE_ANON_KEY`** (Nest only; drives `/auth/*` plus `auth.getUser()` on guarded routes)
   - (`SUPABASE_JWT_SECRET` is optional — validation uses Supabase Auth, not the legacy JWT secret alone)

## Troubleshooting

| Error                                                      | Fix                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Could not find the table 'public.cv' in the schema cache` | Run `supabase db push` (or apply the migration SQL manually).                                                                                                                                                                               |
| `Invalid or expired token`                                 | Sign out and sign in again. Tokens are issued/checked only on `apps/api`; ensure `SUPABASE_*` vars there match your Supabase project. List `NEXT_PUBLIC_API_URL`/web origin inside `apps/api` `CORS_ORIGIN` when using different hostnames. |

## 2. Environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Fill in your Supabase values. The API listens on port **3001** by default; the web app on **3000**.

## 3. Install & run

```bash
pnpm install
pnpm dev
```

Or run apps separately:

```bash
pnpm dev:api   # NestJS on http://localhost:3001
pnpm dev:web   # Next.js on http://localhost:3000
```

### Quality checks

From the repo root:

- **`pnpm format`** / **`pnpm format:check`** — Prettier (`prettier-plugin-tailwindcss` for class sorting; includes Markdown)
- **`pnpm lint`** / **`pnpm lint:fix`** — Biome (lint and import organization only)
- **`pnpm typecheck`** — fast TypeScript compile check across all packages
- **`pnpm verify`** — same checks as CI (Prettier, Biome, typecheck, tests, build); runs automatically on `git push` via Lefthook
- **`pnpm test`** — unit tests with coverage (Vitest in `packages/types` and `apps/web`, Jest in `apps/api`)

Git hooks (Lefthook, installed via `pnpm install`):

- **pre-commit** — Biome lint fixes on staged code, then Prettier on staged files (including Markdown)
- **pre-push** — full `pnpm verify` pipeline

CI mirrors `pnpm verify` via `.github/workflows/ci.yml` on pushes and pull requests to `main`: five parallel jobs (Prettier, Biome, typecheck, tests, build). Each job restores cached `node_modules` when the lockfile is unchanged (see `.github/actions/setup-monorepo`); only the **Build** job saves the cache after a fresh install.

## Usage

1. Open http://localhost:3000 and **register** / **sign in**.
2. Go to **Dashboard → New CV**.
3. Edit sections (Basics, Work, Education, …) and **Save**.
4. Data is validated server-side against the JSON Resume schema before persisting.

## API (`apps/api`)

Authenticate with Bearer tokens obtained from **`POST /auth/login`** / **`POST /auth/register`** (see `apps/api/README.md`). The UI stores tokens in **`sessionStorage`** and sends **`Authorization: Bearer <access_token>`** on `/cv*` calls (no cookie-based API auth).

| Method | Path      | Description                |
| ------ | --------- | -------------------------- |
| GET    | `/cv`     | List user's CVs            |
| GET    | `/cv/:id` | Get one CV                 |
| POST   | `/cv`     | Create `{ title?, data }`  |
| PATCH  | `/cv/:id` | Update `{ title?, data? }` |
| DELETE | `/cv/:id` | Delete CV                  |

## Security

- Row Level Security on `public.cv`: users only access their own rows (`auth.uid() = user_id`).
- Nest validates Supabase access tokens via `auth.getUser()` (works with current JWT signing keys) and forwards the user token to Supabase so RLS applies.

## Project structure

```
apps/
  api/          NestJS REST API
  web/          Next.js frontend
packages/
  schemas/      resume.schema.json
  types/        shared Resume types
supabase/
  migrations/   database schema
```
