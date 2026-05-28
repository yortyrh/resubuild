## Why

Many users only have a PDF résumé, not a JSON Resume file. Manual re-entry is slow and error-prone. An agent-driven PDF import pipeline can extract structured data, validate and enrich it (dates, employer references, URLs), and produce a conforming JSON Resume document that feeds the same create path as manual and JSON import—unlocking onboarding for the most common résumé format.

## What Changes

- Add a **server-side PDF import pipeline** powered by [Mastra](https://mastra.ai) that accepts an uploaded PDF and returns a JSON Resume object validated against the official schema.
- Implement a **multi-step agent workflow**: extract text from PDF → map to JSON Resume sections → verify/correct (schema validation, date consistency, optional web lookup for company/institution names and URLs).
- After successful extraction, call the **existing CV create flow** (`prepareImportedResume` + `POST /cv` persistence semantics)—no parallel storage model.
- Expose **`POST /cv/import/pdf`** (multipart) on the Nest API with auth, size limits, and structured error responses (extraction failure, agent timeout, schema validation).
- Add **Import from PDF** UI on `/dashboard/cv/new` alongside manual create and JSON import: upload PDF, show progress/status, navigate to editor on success.
- Introduce a dedicated **`apps/import-agent`** workspace (or equivalent package boundary) so agent tools, prompts, and workflows are extensible for future incremental section writes and user chat refinement without rewriting the import entry point.
- Persist import **job status** in memory or Redis-backed store for v1 (async job id + polling endpoint) so long-running agent work does not block HTTP timeouts.
- Require **per-user LLM configuration** before PDF import is available: user selects provider → model (from Mastra catalog) → provider-scoped API key; server validates model against pinned Mastra router catalog and probes the key before activation.

## Capabilities

### New Capabilities

- `cv-pdf-import`: PDF upload, agent extraction to JSON Resume, verification tools, job lifecycle, and integration with CV create.
- `resume-import-agent`: Mastra agent configuration, tool registry (PDF parse, schema validate, date normalize, web search), and workflow composition reusable by future chat or partial-import features.
- `import-llm-config`: Per-user provider/model/API-key settings, Mastra-aligned model validation, catalog endpoints, and activation gate for PDF import.

### Modified Capabilities

- `web-application`: New CV page adds PDF import path (gated on LLM config) plus settings UI for provider → model → API key setup.
- `cv-rest-api`: New authenticated import and LLM config endpoints; clarify that import uses saved user model + key and the same create + schema validation path as JSON import.
- `monorepo-and-toolchain`: Document new `apps/import-agent` workspace, pinned model catalog, encryption for user API keys, and dev scripts.
- `database-cv-rls`: New table (or extension) for encrypted per-user import LLM settings with RLS.

## Impact

- **New**: `apps/import-agent` (Mastra workflows, tools, tests); optional thin Nest `ImportModule` in `apps/api` orchestrating agent + `CvService`.
- **apps/api**: `POST /cv/import/pdf`, `GET /cv/import/:jobId` (or SSE), wiring to agent service and existing `prepareImportedResume` / `ResumeSchemaValidator` / `CvService.create`.
- **apps/web**: PDF import form component, API helpers, progress UI on `/dashboard/cv/new`.
- **packages/types**: Reuse `prepareImportedResume` from `import-jsonresume-cv` (dependency—implement JSON import first or ship helper in parallel).
- **Dependencies**: Mastra (`@mastra/core` model router), PDF text extraction library (e.g. `pdf-parse` or `pdfjs-dist`), optional search API for verification tool.
- **Data**: Supabase table for user import LLM config (encrypted `api_key`, `model_id`, timestamps); RLS scoped to `auth.uid()`.
- **Env/config (server)**: `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`, optional `TAVILY_API_KEY` / search provider, import job TTL, max PDF bytes — **not** per-user LLM keys in env (those are user-supplied via settings).
- **Catalog**: Pinned JSON catalog of Mastra-supported providers/models (sync script from models.dev / Mastra gateway metadata); used for allowlist validation and settings UI.
- **Testing**: Vitest/Jest for model-id parsing, catalog validation, settings CRUD, and agent workflow mocks; manual smoke with user-configured key.
