## 1. Database schema and RLS

- [x] 1.1 Add Supabase migration creating normalized tables (`cv` with basics columns and `location jsonb`, `cv_profile`, `cv_work`, `cv_volunteer`, `cv_education`, `cv_award`, `cv_certificate`, `cv_publication`, `cv_skill`, `cv_language`, `cv_interest`, `cv_reference`, `cv_project`) per `design.md` ER diagram; drop `cv.title` column
- [x] 1.2 Add `meta_version`, `meta_canonical`, `meta_last_modified` columns to `cv`; add `(cv_id, sort)` indexes on sort-backed tables only; add date indexes on date-primary tables
- [x] 1.3 Enable RLS on every new table with policies joining to `cv.user_id = auth.uid()`
- [x] 1.4 Add data backfill migration: read existing `cv.data`, disassemble into normalized rows, verify round-trip in migration script or one-off task
- [x] 1.5 Add final migration dropping `cv.data` and `cv.title` after cutover verification

## 2. Shared types — assembler / disassembler

- [x] 2.1 Add normalized row TypeScript types in `packages/types/src/` matching database columns (snake_case DB ↔ camelCase JSON Resume)
- [x] 2.2 Implement `disassembleResume(data: Resume): NormalizedCvPayload` mapping all sections including jsonb string lists and `cv.location`
- [x] 2.3 Implement `assembleResume(header, sections): Resume` with date ordering for date sections and `ORDER BY sort` for sort-backed arrays; empty jsonb → `[]` defaults
- [x] 2.4 Add unit tests in `packages/types/src/resume-normalized.test.ts` covering round-trip for sample fixtures from `.samples/resumes/jsonresume/`

## 3. API persistence layer

- [x] 3.1 Create `CvNormalizedRepository` (or feature-scoped repositories) in `apps/api/src/cv/` for section CRUD against Supabase
- [x] 3.2 Refactor `CvService.create/findOne/findAll/update/delete` to use normalized storage, assemble `data` on read, and compute `title` from basics columns via `deriveCvTitleFromBasics`
- [x] 3.3 Refactor `CvItemService.mutateCvData` to read/write individual tables; bump `cv.meta_version` on success; remove full-document clone path
- [x] 3.4 Map URL `:index` to row via section list ordering (date DESC for date sections; `sort ASC, id ASC` for sort-backed sections)
- [x] 3.5 Store string lists (`highlights`, `courses`, `keywords`, `roles`) as jsonb on parent row writes

## 4. API routes — section reads

- [x] 4.1 Add `GET /cv/:cvId/work`, `/volunteer`, `/education`, `/skills`, `/projects`, `/awards`, `/certificates`, `/publications`, `/languages`, `/interests`, `/references`, `/profiles` returning section arrays only
- [x] 4.2 Add `GET /cv/:cvId/basics` returning basics + location + profiles assembled object
- [x] 4.3 Document section GET routes in OpenAPI/Swagger if project uses it

## 4b. API — reorder endpoints (sort-backed sections)

- [x] 4b.1 Add `ReorderSectionDto` with `order: string[]` (uuid) and optional `version`
- [x] 4b.2 Implement `CvItemService.reorderSection(user, cvId, section, order, version)` updating `sort` in transaction and bumping `cv.meta_version`
- [x] 4b.3 Add `PUT` routes for `profiles`, `skills`, `languages`, `interests`, `references` reorder
- [x] 4b.4 Validate permutation; return 400 on mismatch, 409 on stale version; return `{ items, version }`
- [x] 4b.5 E2e tests: create 3 skills, reorder via API, assert GET order

## 5. Validation and concurrency

- [x] 5.1 Move version checks from `data.meta.version` to `cv.meta_version` in `CvItemService` and `CvService`
- [x] 5.2 Run full JSON Resume validation on assembled document for `POST /cv` import and bulk replace; keep DTO validation on item PATCH/POST
- [x] 5.3 Ensure failed transactions roll back partial section writes

## 6. Web client (section-scoped loads)

- [x] 6.1 Add section fetch helpers in `apps/web/src/lib/api.ts` for new GET routes
- [x] 6.2 Refactor `CvEditor` / section components to load section data on tab mount where practical (fallback to full CV until all tabs migrated)
- [x] 6.3 Confirm item mutation responses still refresh local section state and version

## 7. Tests

- [x] 7.1 Unit tests for `CvNormalizedRepository` / assembler integration in `apps/api`
- [x] 7.2 Update existing `CvItemService` and `CvService` unit tests to mock normalized storage
- [x] 7.3 Update API e2e tests in `apps/api/test/` for create, item CRUD, version conflict, and section GET routes
- [x] 7.4 Run `pnpm test -- --run` and `pnpm test:e2e` locally with Supabase

## E2E test impact

- **Update required**: Existing CV item CRUD e2e tests must assert against normalized persistence (response shapes unchanged; may need seed/migration applied first).
- **Add**: Section GET route coverage for at least work and skills; migration backfill smoke test on seeded sample CVs.
- **Must pass unchanged**: Auth-guard 401 behavior, media upload auth parity, dashboard navigation flows unrelated to CV body storage.

## 8. Related changes and docs

- [x] 8.1 Update `import-jsonresume-cv` implementation (when applied) to disassemble into normalized tables via shared helper — **note added to `import-jsonresume-cv/design.md`; import uses `POST /cv` → `CvService.create` → `disassembleResume` (no parallel persistence path)**
- [x] 8.2 Note dependency for `import-pdf-resume` agent flow to call disassembler after JSON generation — **documented in `import-pdf-resume/design.md`**
- [x] 8.3 Archive this change updating `openspec/specs/database-cv-rls`, `cv-rest-api`, `cv-item-crud`, and `resume-schema-validation` main specs
