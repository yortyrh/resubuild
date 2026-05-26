## 1. Prerequisites and workspace setup

- [ ] 1.1 Ensure `prepareImportedResume` from `import-jsonresume-cv` is merged or implemented in `packages/types` before PDF finalize integration
- [ ] 1.2 Scaffold `apps/import-agent` in `pnpm-workspace.yaml` with `package.json`, `tsconfig.json`, Vitest config, and Turborepo pipeline scripts
- [ ] 1.3 Add `packages/import-models` with pinned Mastra provider/model catalog (`catalog.json`) and optional `pnpm import-models:sync` script from models.dev / Mastra gateway metadata
- [ ] 1.4 Add Mastra, PDF parser, and optional search SDK dependencies to `apps/import-agent`
- [ ] 1.5 Document server env in `apps/api/.env.example` and root README: `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`, `SEARCH_API_KEY`, `PDF_IMPORT_MAX_BYTES`, `PDF_IMPORT_ENABLED`

## 2. Database — import LLM settings

- [ ] 2.1 Add Supabase migration for `public.import_llm_config` (`user_id`, `model_id`, `api_key_encrypted`, timestamps) with RLS policies
- [ ] 2.2 Implement encryption/decryption helper for user API keys using `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` with colocated tests

## 3. Model catalog and validation

- [ ] 3.1 Implement `parseMastraModelId()` for `provider/model` and `gateway/provider/model` forms with colocated tests
- [ ] 3.2 Implement `validateImportModelId(modelId, catalog)` against pinned catalog (provider allowlist + model membership) with colocated tests
- [ ] 3.3 Map catalog providers to Mastra `apiKeyEnvVar` labels for UI (e.g. `openai` → “OpenAI API key”)
- [ ] 3.4 Seed catalog with curated providers for v1 (at minimum `openai`, `anthropic`, `google`) and recommended PDF-import models per provider

## 4. API — LLM config endpoints

- [ ] 4.1 Create `ImportLlmConfigController` with `GET /import/llm/providers` and `GET /import/llm/providers/:providerId/models`
- [ ] 4.2 Implement `GET /import/llm/config` (status + model id, no raw key) and `PUT /import/llm/config` with catalog validation
- [ ] 4.3 Implement API key probe on save via Mastra minimal generate call; return `422` on auth failure
- [ ] 4.4 Add colocated Jest tests for malformed model ids, out-of-catalog models, successful save, and key probe failure

## 5. Import agent — tools and workflow

- [ ] 5.1 Implement `extractPdfTextTool` with colocated tests using a minimal PDF fixture buffer
- [ ] 5.2 Implement `validateResumeSchemaTool` wrapping AJV + `packages/schemas/resume.schema.json` with colocated tests
- [ ] 5.3 Implement `normalizeDatesTool` for JSON Resume date fields with colocated tests
- [ ] 5.4 Implement optional `webLookupTool` (no-op when search key absent) with mocked search tests
- [ ] 5.5 Export `toolRegistry` and shared workflow context types for future workflows
- [ ] 5.6 Implement `createPdfImportWorkflow({ modelId, apiKey })` with extract → draft → verify/repair loop (max 3) → finalize callback hook
- [ ] 5.7 Add workflow unit tests with mocked LLM returning fixture JSON Resume drafts and repair passes

## 6. API — PDF import module and job store

- [ ] 6.1 Add in-memory `ImportJobStore` (user-scoped, TTL) with types `ImportJobStatus` / progress labels
- [ ] 6.2 Create `ImportModule` + `ImportController` with `POST /cv/import/pdf` gated on valid user LLM config; return `{ jobId }` (202)
- [ ] 6.3 Implement `GET /cv/import/:jobId` with owner check and 404 for unknown/expired jobs
- [ ] 6.4 Wire background runner: load user LLM config, invoke PDF workflow with saved Mastra model + key, call `CvService.create` on success
- [ ] 6.5 Return `403`/`422` when LLM config missing; structured `errors` on job failure including expired key hint
- [ ] 6.6 Add colocated Jest tests for config gate, auth, MIME rejection, job lifecycle, and successful create mock

## 7. Web — LLM settings and PDF import UI

- [ ] 7.1 Add API helpers: `getImportLlmProviders`, `getImportLlmModels`, `getImportLlmConfig`, `saveImportLlmConfig`
- [ ] 7.2 Create import LLM settings page/component with provider → model (select) → API key flow and colocated tests
- [ ] 7.3 Add `startPdfImport` and `getPdfImportJob` helpers in `apps/web/src/lib/api.ts`
- [ ] 7.4 Create `import-pdf-cv-form.tsx` gated on config status; show setup link when unset
- [ ] 7.5 Add colocated `import-pdf-cv-form.test.tsx` for gated state, poll success, failure, and no upload until confirm
- [ ] 7.6 Update `/dashboard/cv/new` page client for manual, JSON, and gated PDF import paths
- [ ] 7.7 Navigate to `/dashboard/cv/:id` on job success

## 8. Samples and fixtures

- [ ] 8.1 Add `.samples/resumes/pdf/` PDF fixtures (generate from existing JSON samples via `pnpm samples:pdf` where applicable)
- [ ] 8.2 Document manual smoke: configure LLM (provider + model + key) → import sample PDF → verify editor

## 9. Verification

- [ ] 9.1 Manual smoke: save invalid model id → inline/API error, settings not activated
- [ ] 9.2 Manual smoke: save valid model + bad API key → 422, PDF import remains disabled
- [ ] 9.3 Manual smoke: valid config → upload sample PDF → poll → editor shows extracted sections
- [ ] 9.4 Manual smoke: upload non-PDF and oversize file → errors, no CV created
- [ ] 9.5 Run `pnpm test -- --run` for `packages/import-models`, `apps/import-agent`, `apps/api`, and `apps/web`
- [ ] 9.6 Run `pnpm verify`

## 10. E2E test impact

- [ ] 10.1 **Must pass unchanged** — existing E2E flows for auth, dashboard list, manual create, and edit unless new layout breaks shared selectors
- [ ] 10.2 **Optional follow-up** — E2E for LLM settings + PDF import with mocked Mastra in test env (not required for v1 if manual smoke passes)
