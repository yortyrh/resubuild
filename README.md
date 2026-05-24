# Resumind

Monorepo for managing CVs with **Next.js** (UI + Supabase Auth), **NestJS** (REST API + schema validation), and **Supabase Postgres** (RLS-protected storage).

## Stack

- **apps/web** — Next.js App Router, shadcn-style UI, `@supabase/ssr`
- **apps/api** — NestJS REST API, Supabase JWT guard, AJV validation against [JSON Resume schema](https://raw.githubusercontent.com/jsonresume/resume-schema/refs/heads/master/schema.json)
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
   - Project URL → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (`SUPABASE_JWT_SECRET` is optional — the API validates tokens via Supabase Auth, not the legacy JWT secret)

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Could not find the table 'public.cv' in the schema cache` | Run `supabase db push` (or apply the migration SQL manually). |
| `Invalid or expired token` | Sign out and sign in again. Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` match between `apps/web` and `apps/api`. The API uses `auth.getUser()` — no legacy JWT secret required. |

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

## Usage

1. Open http://localhost:3000 and **register** / **sign in**.
2. Go to **Dashboard → New CV**.
3. Edit sections (Basics, Work, Education, …) and **Save**.
4. Data is validated server-side against the JSON Resume schema before persisting.

## API (authenticated)

All routes require `Authorization: Bearer <supabase_access_token>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cv` | List user's CVs |
| GET | `/cv/:id` | Get one CV |
| POST | `/cv` | Create `{ title?, data }` |
| PATCH | `/cv/:id` | Update `{ title?, data? }` |
| DELETE | `/cv/:id` | Delete CV |

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
