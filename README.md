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
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

## Local development (Supabase CLI)

For day-to-day work on your machine, use the local Supabase stack and the seed script. No cloud project required.

### Setup

From the repo root:

```bash
pnpm install
supabase start
pnpm setup:env      # writes apps/api/.env and apps/web/.env from supabase status
pnpm samples:seed   # creates dev + E2E accounts, sample CVs, and media (no API needed)
```

On first seed, **unique passwords are generated for your machine** and saved to `.samples/local-credentials.json` (gitignored). The seed prints them to the terminal. To show them again later:

```bash
pnpm local:credentials
```

**Developer sign-in** (use this in the browser):

- Email: `developer@resumind.local`
- Password: run `pnpm local:credentials` (not committed to git)

### Run the app

```bash
pnpm dev            # web :3000 + api :3001
```

Open http://localhost:3000, sign in with the developer account, and you should see 10 sample CVs on the dashboard.

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

## Troubleshooting

| Error                                                      | Fix                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Could not find the table 'public.cv' in the schema cache` | Run `supabase db push` or `supabase start` with migrations applied.                                   |
| `Invalid or expired token`                                 | Sign out and sign in again. Ensure `SUPABASE_*` vars in `apps/api/.env` match your Supabase instance. |
| Forgot local dev password                                  | Run `pnpm local:credentials`.                                                                         |

## API (`apps/api`)

Authenticate with Bearer tokens from **`POST /auth/login`** / **`POST /auth/register`**. The UI stores tokens in **`sessionStorage`**.

| Method | Path      | Description                |
| ------ | --------- | -------------------------- |
| GET    | `/cv`     | List user's CVs            |
| GET    | `/cv/:id` | Get one CV                 |
| POST   | `/cv`     | Create `{ title?, data }`  |
| PATCH  | `/cv/:id` | Update `{ title?, data? }` |
| DELETE | `/cv/:id` | Delete CV                  |

## Security

- Row Level Security on `public.cv`: users only access their own rows (`auth.uid() = user_id`).
- Nest validates Supabase access tokens via `auth.getUser()` and forwards the user token to Supabase so RLS applies.

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
.samples/       seed fixture (CVs, media, local credentials)
```
