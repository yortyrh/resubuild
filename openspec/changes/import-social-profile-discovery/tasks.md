## 1. Platform catalog and merge utilities

- [x] 1.1 Add `social-profile-platforms.ts` in `apps/import-agent/src/` with platform catalog (network label, query template, hostname/path validators) aligned with `resume-template-header-icons`
- [x] 1.2 Add `merge-discovered-profiles.ts` in `apps/import-agent/src/` (or `packages/types/src/` if shared) with dedupe-by-URL and preserve-existing-network rules from `design.md`
- [x] 1.3 Colocated Vitest beside each utility covering merge, dedupe, username derivation, and invalid URL rejection

## 2. Discover social profiles tool

- [x] 2.1 Add `discover-social-profiles.tool.ts` in `apps/import-agent/src/tools/` accepting draft identity signals, existing profiles, and `searchApiKey`; injectable Tavily search fn for tests
- [x] 2.2 Enforce bounded search (max 5 queries, max 3 results each, per-platform stop on first valid URL)
- [x] 2.3 Colocated Vitest in `discover-social-profiles.tool.test.ts` covering skip-without-key, successful merge candidates, and error tolerance

## 3. Workflow integration

- [x] 3.1 Extend `ImportJobProgress` in `apps/import-agent/src/types.ts` with optional `discovering-profiles` step label
- [x] 3.2 Extend `TextImportWorkflowResult` with optional `discoveredProfilesCount`
- [x] 3.3 Invoke discovery in `runTextImportWorkflow` (`pdf-import.workflow.ts`) after validation succeeds, before finalize; merge into draft `basics.profiles`
- [x] 3.4 Ensure `runWebsiteImportWorkflow` uses the same text path so website imports get discovery
- [x] 3.5 Register `discoverSocialProfiles` in `tool-registry.ts` and export from `index.ts`
- [x] 3.6 Update `pdf-import.test.ts` / `text-import.test.ts` with mocked search asserting profiles merged into draft result

## 4. API job metadata

- [x] 4.1 Extend `ImportJobRecord` in `apps/api/src/import/import-job.store.ts` with optional `discoveredProfilesCount`
- [x] 4.2 Pass count from workflow result in `apps/api/src/import/import.service.ts` when storing succeeded jobs
- [x] 4.3 Include `discoveredProfilesCount` in `GET /cv/import/:jobId` response DTO
- [x] 4.4 Update `import.service.spec.ts` and `import.controller.spec.ts` for the new optional field

## 5. Web client toasts

- [x] 5.1 Extend `ImportJobStatus` type in `apps/web/src/lib/api.ts` with optional `discoveredProfilesCount`
- [x] 5.2 Update `use-import-preview-toasts.ts` to toast when `discoveredProfilesCount > 0` on agent success (combine with existing ready message)
- [x] 5.3 Pass job metadata from `import-file-form.tsx` and `import-url-form.tsx` into toast hook
- [x] 5.4 Colocated tests for toast hook and import forms when count is present vs absent

## 6. Documentation

- [x] 6.1 Add brief discovery note to `apps/import-agent/README.md` (Tavily required, review in Preview before Save)

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, work/volunteer item routes, media upload, export, template presentation, import LLM config, import URL validation, markdown import rejection scenarios

### Update required

- None — `discoveredProfilesCount` is an additive optional field on `GET /cv/import/:jobId`; existing import E2E tests do not assert absence of unknown fields

### Add

- None for v1 — discovery requires live Tavily + LLM in E2E; behavior covered by import-agent unit tests and API unit tests with mocked search
