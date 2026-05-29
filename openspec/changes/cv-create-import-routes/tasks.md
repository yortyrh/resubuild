## 1. Import agent — shared text workflow

- [ ] 1.1 Refactor `apps/import-agent/src/workflows/pdf-import.workflow.ts` to export `runTextImportWorkflow({ sourceText, ... })` shared by PDF and Markdown
- [ ] 1.2 Add colocated unit tests for text workflow

## 2. API — new import endpoints

- [ ] 2.1 Add `POST /cv/import/markdown` handler in `apps/api/src/import/import.controller.ts`
- [ ] 2.2 Extend `ImportService` with `startMarkdownImport` reusing job store and LLM gate
- [ ] 2.3 Extend `importFromUrl` in `import.service.ts` to rewrite `registry.jsonresume.org` profile URLs to `.json` endpoints
- [ ] 2.4 Add unit tests in `import.service.spec.ts` and `import-url.util.spec.ts` for registry URL resolution
- [ ] 2.5 Add `importCvFromMarkdown` helper in `apps/web/src/lib/api.ts`

## 3. Web — route split and layout

- [ ] 3.1 Add `apps/web/src/app/dashboard/cv/new/layout.tsx` with shared heading, subtitle, and cancel link
- [ ] 3.2 Add route pages: `create/page.tsx`, `import/pdf/page.tsx`, `import/json/page.tsx`, `import/website/page.tsx`, `import/markdown/page.tsx`
- [ ] 3.3 Change `apps/web/src/app/dashboard/cv/new/page.tsx` to redirect to `/dashboard/cv/new/import/pdf`
- [ ] 3.4 Remove tabbed `NewCvPageClient` (or reduce to thin wrappers per route)

## 4. Web — forms and components

- [ ] 4.1 Create `ImportWebsiteForm` component (URL input, preview, confirm → `importCvFromUrl` + `createCv`)
- [ ] 4.2 Create `ImportMarkdownCvForm` (mirror PDF form: LLM gate, file upload, job polling)
- [ ] 4.3 Remove URL input from `ImportCvForm` (JSON-only on `/import/json`)
- [ ] 4.4 Wire each route page to the appropriate form component with shared cancel/navigate handlers

## 5. Web — dashboard dropdown

- [ ] 5.1 Replace **New CV** / **Create CV** links in `apps/web/src/components/dashboard/cv-list.tsx` with shadcn `DropdownMenu` listing all five routes
- [ ] 5.2 Add colocated tests for dropdown navigation targets

## 6. Tests and verification

- [ ] 6.1 Update `new-cv-page-client.test.tsx` or replace with per-route page tests
- [ ] 6.2 Add Vitest for `ImportWebsiteForm` and `ImportMarkdownCvForm`
- [ ] 6.3 Run `pnpm test -- --run` and fix failures in touched packages

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — CV CRUD, auth, media upload, import LLM config (`GET /import/llm/providers`, `GET /import/llm/config`), existing `POST /cv/import/from-url` rejection scenarios for invalid URLs

### Update required

- `local-supabase.e2e-spec.ts` — add scenario: `POST /cv/import/from-url` with `https://registry.jsonresume.org/thomasdavis` returns valid normalized JSON Resume data (may use mocked fetch or live registry depending on existing test patterns)

### Add

- `local-supabase.e2e-spec.ts` — `POST /cv/import/markdown` rejects missing file (400) and rejects when LLM not configured (403)
