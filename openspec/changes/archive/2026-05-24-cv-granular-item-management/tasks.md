## 1. API foundation

- [x] 1.1 Add `CvItemService` in `apps/api/src/cv/` with shared `mutateCvData` (load, version check, apply mutator, validate, meta bump, persist)
- [x] 1.2 Add item DTOs for basics, profiles, work, volunteer, education, skill, project, award, certificate, publication, language, interest, reference, and nested highlight/course payloads
- [x] 1.3 Add `CvItemsController` (or extend `CvController`) with routes from design.md under `/cv/:cvId/...`
- [x] 1.4 Wire module providers and export item service for tests
- [x] 1.5 Add Jest specs beside `cv-item.service.spec.ts` and `cv-items.controller.spec.ts` covering create/update/delete, 404, 409, and validation failures

## 2. Web API client

- [x] 2.1 Add item-scoped functions in `apps/web/src/lib/api.ts` mirroring all Nest routes (include `version` parameter)
- [x] 2.2 Define shared response types for item mutations (entity, indices, `meta.version`)
- [x] 2.3 Add Vitest coverage beside `api.ts` or a colocated `api.cv-items.spec.ts` for request shape and error mapping

## 3. Shared UI primitives

- [x] 3.1 Create `TagsInput` in `apps/web/src/components/cv/tags-input.tsx` for ordered string lists (keyboard add/remove, accessible labels)
- [x] 3.2 Create `ResumeItemRow` view component with left/right resume layout and Edit/Delete actions
- [x] 3.3 Create `ResumeItemForm` wrapper with Save/Cancel, loading, and error display
- [x] 3.4 Create `SectionCreateForm` for bottom-of-section create flows
- [x] 3.5 Create `DeleteItemDialog` using shadcn `AlertDialog`
- [x] 3.6 Add `useCvItemMutation` hook for version refresh, toast, and 409 handling

## 4. Refactor CV editor shell

- [x] 4.1 Update `apps/web/src/components/cv/cv-editor.tsx` to load CV id/version, remove global Save CV for resume body, keep title save path
- [x] 4.2 Pass `cvId`, `version`, and refresh callback into `CvSections`
- [x] 4.3 Ensure `/dashboard/cv/new` creates CV then redirects to item-based editor without bulk unsaved state

## 5. Section migrations (view / edit / create / delete)

- [x] 5.1 Basics tab: resume view + inline edit form + `PATCH .../basics` on save (including photo upload then basics patch)
- [x] 5.2 Social profiles tab: item rows + profile CRUD APIs
- [x] 5.3 Work tab: work rows + nested highlight rows with separate CRUD
- [x] 5.4 Volunteer tab: volunteer rows + nested highlight CRUD
- [x] 5.5 Education tab: education rows + nested course CRUD
- [x] 5.6 Skills tab: skill rows with TagsInput for keywords
- [x] 5.7 Projects tab: project rows, TagsInput for keywords and roles, nested highlight CRUD
- [x] 5.8 Awards tab: award item CRUD with resume-style view
- [x] 5.9 Certificates tab: certificate item CRUD
- [x] 5.10 Publications tab: publication item CRUD
- [x] 5.11 Languages tab: language item CRUD
- [x] 5.12 Interests tab: interest rows with TagsInput for keywords
- [x] 5.13 References tab: reference item CRUD with resume-style view (name + reference text)
- [x] 5.14 Remove or retire `ArraySection` usage from migrated tabs in `cv-sections.tsx`

## 6. Verification

- [x] 6.1 Run `pnpm test -- --run` in `apps/api` for new CV item tests
- [x] 6.2 Run `pnpm test -- --run` in `apps/web` for client and component tests
- [ ] 6.3 Manual QA checklist: each entity type create/edit/delete (including references), tags on skill/project/interest, delete confirmation, 409 reload message
- [x] 6.4 Run root `pnpm build` to confirm monorepo builds
