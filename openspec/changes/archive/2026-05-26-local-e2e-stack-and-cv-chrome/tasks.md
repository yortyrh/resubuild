## 1. Local env and fixture

- [x] 1.1 Add `scripts/setup-local-env.sh` and root `pnpm setup:env`
- [x] 1.2 Add `.samples/e2e-fixture.json` with developer + E2E accounts, 10 resumes, media mapping
- [x] 1.3 Add sample JSON resumes under `.samples/resumes/jsonresume/` and profile images under `.samples/media/`
- [x] 1.4 Gitignore `.samples/e2e-fixture.state.json` and `.samples/local-credentials.json`
- [x] 1.5 Update root `.env.example` and `apps/api/.env.example` for local-first workflow

## 2. Seed scripts

- [x] 2.1 Add `scripts/lib/e2e-fixture-lib.mjs`, `seed-supabase.mjs`, `local-credentials.mjs`, types
- [x] 2.2 Add `scripts/seed-e2e-fixture.mjs` with idempotent Auth/Postgres/Storage seed
- [x] 2.3 Add `scripts/show-local-credentials.mjs` and root `pnpm local:credentials`
- [x] 2.4 Add optional `scripts/generate-sample-pdfs.mjs` and `pnpm samples:pdf`
- [x] 2.5 Add root `pnpm samples:seed` and devDeps `@supabase/supabase-js`, `puppeteer`

## 3. E2E test harness

- [x] 3.1 Add `apps/api/test/e2e/create-e2e-app.ts` mirroring production ValidationPipe
- [x] 3.2 Add `apps/api/test/e2e/fixture.ts` and `global-setup.ts` with fail-fast checks
- [x] 3.3 Add `apps/api/test/e2e/jest-e2e.config.cjs` and `local-supabase.e2e-spec.ts` (auth, CV, media)
- [x] 3.4 Add `test:e2e` script to `apps/api/package.json` and root `pnpm test:e2e`

## 4. Documentation and OpenSpec

- [x] 4.1 Rewrite README for local Supabase-first setup; retain cloud section
- [x] 4.2 Add `openspec/specs/e2e-testing/spec.md` capability spec
- [x] 4.3 Update `openspec/config.yaml` context and task rules for E2E impact sections
- [x] 4.4 Tune `supabase/config.toml` for local stack

## 5. CV editor chrome

- [x] 5.1 Refactor `cv-section-layout.tsx`: context provider, export `CvSectionNavToggle`, remove toggle from sidebar
- [x] 5.2 Add `cv-section-content.tsx` wrapper with consistent left padding
- [x] 5.3 Integrate toggle + breadcrumb row in `cv-sections.tsx`
- [x] 5.4 Update colocated tests (`cv-section-layout.test.tsx`, `cv-section-content.test.tsx`, skeleton tests)
- [x] 5.5 Fix Wysimark shell CSS in `globals.css` (direct-child selectors, square corners, toolbar height)

## 6. Dashboard layout

- [x] 6.1 Move page header and New CV button into `cv-list.tsx`
- [x] 6.2 Simplify `dashboard/page.tsx` to render `CvList` only
- [x] 6.3 Match empty-state card styling to populated `surface-soft` cards

## E2E test impact

### Must pass unchanged

- None (this change introduces the E2E suite)

### Update required

- None (initial E2E catalog)

### Add

- `local-supabase.e2e-spec.ts` — auth: login + `/auth/me` + 401 without token
- `local-supabase.e2e-spec.ts` — CV REST: list seeded ids, get by id, profile photos, invalid POST 400
- `local-supabase.e2e-spec.ts` — media: public stream, owner meta, authenticated upload, 401 without token
