## Context

Unit tests mock Supabase and isolate Nest services. That misses RLS enforcement, Auth token flows, Storage uploads, and cross-module wiring. Cloud Supabase setup also slowed onboarding. The working tree adds a local-first path: Supabase CLI → env generation → direct seed → Supertest E2E.

Separately, after the collapsible sidebar shipped, the nav toggle lived inside the sticky aside while breadcrumbs sat above content—authors had to look in two places. Wysimark's nested `.rounded-md.border` selectors also fought custom toolbar height and corner-radius overrides.

## Goals / Non-Goals

**Goals:**

- One-command local env from running Supabase (`pnpm setup:env`).
- Deterministic sample data for dev browsing and E2E regression (10 CVs, profile photos, two accounts).
- E2E tests that exercise auth, CV CRUD list/get/validate, and media upload/stream without a separate API process.
- Document E2E impact expectations in OpenSpec task templates.
- Align editor chrome: toggle beside breadcrumb, padded section body, stable Wysimark CSS.

**Non-Goals:**

- Running E2E in CI (requires local Supabase; stays developer-only).
- Changing REST route shapes or JSON Resume schema.
- Replacing Wysimark or altering toolbar presets beyond shell styling.

## Decisions

### 1. Seed Supabase directly, not via Nest API

**Choice:** `scripts/seed-e2e-fixture.mjs` uses the Supabase service-role admin client to create Auth users, insert CV rows, upload Storage objects, and assign `basics.image` URLs.

**Rationale:** Seed must work before the API is running; avoids chicken-and-egg for first-time setup. Matches README flow: `supabase start` → `setup:env` → `samples:seed` → `pnpm dev`.

**Alternative considered:** Seed through Nest REST — rejected; requires API up and complicates credential bootstrap.

### 2. Two accounts: developer + E2E

**Choice:** `developerUser` for human browser sign-in; `e2eUser` for automated tests. Passwords generated once per machine in `.samples/local-credentials.json` (gitignored). Only E2E account state (`e2e-fixture.state.json`) is written for Jest.

**Rationale:** Keeps test credentials out of git while giving developers memorable local login via `pnpm local:credentials`.

### 3. In-process Nest E2E via Supertest

**Choice:** `create-e2e-app.ts` mirrors production ValidationPipe; `global-setup.ts` validates env + state file; tests in `local-supabase.e2e-spec.ts` use fixture credentials.

**Rationale:** Fast feedback, no port conflicts, same module graph as production.

### 4. Nav toggle via React context in breadcrumb row

**Choice:** `CvSectionLayoutContext` exposes `navState` and `toggleCollapsed`. `CvSectionNavToggle` renders in `cv-sections.tsx` beside `CvEditorBreadcrumb`; toggle removed from sidebar sticky header.

**Rationale:** Single horizontal chrome line (toggle + trail); sidebar stays icon/label rail only.

### 5. Wysimark CSS uses direct-child selectors

**Choice:** Replace `.rounded-md.border` with `> .border` in `globals.css`; fixed toolbar height (30px block, em-based inline); `border-radius: 0` on inner shell.

**Rationale:** Wysimark DOM nesting changed; descendant selectors were brittle and caused double rounding.

## Risks / Trade-offs

- **E2E flakiness** → Mitigated by `--runInBand`, fail-fast global setup, and idempotent seed (re-run safe).
- **Large `.samples/` media** → Acceptable for local dev; gitignored state/credentials keep secrets out.
- **Puppeteer for PDF generation** → Optional `samples:pdf`; not required for seed or E2E.

## Migration Plan

Developers on cloud-only setup: follow README "Cloud Supabase setup" section unchanged. Local dev: adopt new three-step bootstrap. No database migration required.
