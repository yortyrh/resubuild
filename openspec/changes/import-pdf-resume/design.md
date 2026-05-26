## Context

Resumind stores CVs as JSON Resume documents validated against `packages/schemas/resume.schema.json`. Creating a CV today supports manual Basics entry on `/dashboard/cv/new`; a sibling change (`import-jsonresume-cv`) adds JSON file import via `prepareImportedResume` + `POST /cv`. PDF is the most common résumé format but is unstructured—LLM extraction alone is unreliable for dates, employer names, and schema conformance.

This design introduces a **Mastra-based agent layer** in a new workspace (`apps/import-agent`) orchestrated by Nest (`apps/api`). The agent extracts PDF text, builds JSON Resume, runs verification tools (schema AJV, ISO date normalization, optional web search), then persists through the existing create path. The agent architecture is intentionally modular so future features (incremental section writes, user chat refinement) can reuse tools and workflows without replacing the import entry point.

## Goals / Non-Goals

**Goals:**

- Let signed-in users upload a PDF on `/dashboard/cv/new` and receive a new CV in the editor after server-side processing.
- Produce output conforming to the official JSON Resume schema before persistence.
- Use Mastra workflows with explicit **tools** (parse PDF, validate resume, normalize dates, search web) and a **verify** step that can loop until schema-valid or max attempts reached.
- Reuse `prepareImportedResume`, `ResumeSchemaValidator`, and `CvService.create`—single persistence path.
- Run import asynchronously (job id + polling) to avoid HTTP timeouts on multi-step agent runs.
- Require users to configure a **Mastra-valid model + provider API key** before PDF import is enabled; validate against a pinned catalog and probe keys on save.
- Structure code so workflows can later call item-scoped CV APIs or a chat agent without redesign.

**Non-Goals:**

- Import into an **existing** CV (merge/overwrite)—create-only for v1.
- OCR for scanned/image-only PDFs (text-based PDFs only in v1).
- Guaranteed factual accuracy of employers, dates, or credentials (agent assists; user edits in editor).
- Client-side PDF parsing or LLM calls (all agent work server-side).
- Real-time streaming chat UI (only job status polling in v1; chat is a future extension of the same agent package).
- Storing uploaded PDFs long-term (process in memory, discard after job completion unless debug flag set).
- Platform-wide LLM keys in server env for end-user import (keys are per-user settings, not shared deployment secrets).

## Decisions

### 1. New workspace `apps/import-agent` with Mastra

**Choice:** Add `apps/import-agent` as a TypeScript package exporting:

- `createPdfImportWorkflow()` — Mastra workflow definition
- Tool factories: `extractPdfTextTool`, `validateResumeSchemaTool`, `normalizeDatesTool`, `webLookupTool` (optional when search API configured)
- Types: `ImportJobStatus`, `ImportJobResult`, workflow context

Nest `ImportModule` imports this package and invokes workflows; unit tests live in `import-agent` with mocked LLM and search.

**Rationale:** Keeps agent prompts/tools testable in isolation; Mastra is designed for composable agent workflows and future chat agents sharing the same tool registry.

**Alternatives considered:**

- Inline agent code in `apps/api` — couples Nest to Mastra prompts, harder to extend for chat.
- Separate microservice — overkill for v1 monolith deployment.

### 2. Async job model with in-process store (v1)

**Choice:**

- `POST /cv/import/pdf` → `{ jobId }` (202 Accepted)
- `GET /cv/import/:jobId` → `{ status: queued | running | succeeded | failed, progress?, cvId?, errors? }`
- Job store: in-memory `Map` with TTL (e.g. 1 h) keyed by user id + job id; structure allows Redis swap later.

Workflow runs in background (`setImmediate` / Nest `@nestjs/bull` optional follow-up). On success, job stores `cvId`; on failure, structured `errors[]`.

**Rationale:** Agent runs (extract + LLM + verify loops + web search) exceed typical 30s HTTP limits.

**Alternatives considered:**

- Synchronous POST — poor UX/timeouts.
- BullMQ in v1 — adds Redis dependency; defer unless needed.

### 3. Workflow stages

**Choice:** Mastra workflow steps:

1. **Extract** — `pdf-parse` (or `pdfjs-dist`) → plain text + page count; fail fast if no extractable text.
2. **Draft** — LLM agent maps text to JSON Resume (structured output / JSON mode); prompt includes schema section list and ISO date rules.
3. **Verify loop** (max 3 iterations):
   - `validateResumeSchemaTool` — AJV against `packages/schemas/resume.schema.json`
   - `normalizeDatesTool` — coerce `YYYY`, `YYYY-MM`, full ISO; fix overlapping work/education ranges where obvious
   - `webLookupTool` (optional) — given company/school name, fetch canonical URL or disambiguate; only when `SEARCH_API_KEY` set
   - If invalid, LLM **repair** step receives AJV errors + prior JSON and returns patched document
4. **Finalize** — `prepareImportedResume(draft)` → `CvService.create(user, { data })` → attach `cvId` to job

**Rationale:** Separates extraction from reasoning; verification tools are deterministic and reusable for future chat (“fix my dates”).

**Alternatives considered:**

- Single-shot LLM — high schema failure rate.
- Client-side repair — duplicates server validator authority.

### 4. API surface on existing `CvController` or dedicated `ImportController`

**Choice:** `ImportController` under `@Controller('cv/import')` with same `SupabaseAuthGuard`. Multipart field `file`, `accept` enforced server-side (`application/pdf`), max size env `PDF_IMPORT_MAX_BYTES` (default 5 MB).

**Rationale:** Clear separation from CRUD; keeps OpenAPI/docs grouped.

### 5. Web UI: third path on `/dashboard/cv/new`

**Choice:** Add `ImportPdfCvForm` component:

- File input `accept="application/pdf,.pdf"`
- Submit → `startPdfImport(file)` → poll `getPdfImportJob(jobId)` every 2s with cancel on unmount
- States: idle, uploading, processing (with step label from job `progress`), success → `router.replace(/dashboard/cv/:id)`, failed → show errors
- No POST until user clicks Import (consistent with manual/JSON paths)

**Rationale:** Matches existing new-CV UX patterns; polling simple for v1.

### 6. Per-user LLM configuration (provider → model → API key)

**Choice:** PDF import is gated on per-user settings stored in Supabase (`import_llm_config` or equivalent):

| Field               | Purpose                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `model_id`          | Full Mastra string, e.g. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4-6`, `openrouter/google/gemini-2.5-flash` |
| `api_key_encrypted` | Provider-scoped key, encrypted with server `IMPORT_LLM_CONFIG_ENCRYPTION_KEY`                                      |
| `configured_at`     | Last successful validation timestamp                                                                               |

**Configuration UX (provider-first, not key-first):**

1. User picks **provider** from `GET /import/llm/providers` (curated subset of Mastra built-in gateways: `openai`, `anthropic`, `google`, `groq`, `mistral`, optional `openrouter` gateway).
2. UI loads **models** via `GET /import/llm/providers/:providerId/models` from a **pinned catalog** in repo (`packages/import-models/catalog.json`), generated/synced from [Mastra models index](https://mastra.ai/models) / models.dev — avoids stale free-text ids and matches Mastra router expectations.
3. User enters **API key** labeled per provider (`OPENAI_API_KEY` → “OpenAI API key”, `ANTHROPIC_API_KEY` → “Anthropic API key”, etc., per [Mastra provider docs](https://mastra.ai/models)).
4. Server validates and **probes** key with a minimal Mastra `Agent.generate` (or provider-compatible ping) before save.

**Validation rules (server):**

- Parse `model_id` with Mastra-compatible grammar: `provider/model` or `gateway/provider/model`.
- Reject if provider not in allowlist or model not in catalog entry for that provider.
- Reject malformed strings (missing slash, empty segments).
- On import job start, re-check catalog membership; if model removed in newer deploy, return actionable error asking user to reconfigure.

**Why provider-first beats “list all models then ask for any API key”:**

- Mastra maps each provider to a **specific env var / key**; the key type depends on provider, not model.
- Model ids are `provider/model` strings; picking provider first narrows the model list and prevents mismatched keys (e.g. OpenAI key with Anthropic model).
- Mastra runtime errors on missing keys are clearer when provider is known upfront.

**Alternatives considered:**

- Free-text model field — high invalid-id rate; no alignment with Mastra router.
- Server env `OPENAI_API_KEY` only — does not scale to multi-user SaaS; users bring their own keys.
- Fetch live model list on every settings page load — fragile for CI/offline; use pinned catalog + optional sync script.

### 7. LLM and optional search configuration (server)

**Choice:** Server env (not user settings):

- `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` — required in production for encrypting user API keys
- `SEARCH_API_KEY` optional (Tavily or similar) — `webLookupTool` no-ops when absent
- `PDF_IMPORT_MAX_BYTES`, `PDF_IMPORT_ENABLED`

User LLM keys are **not** read from process env at import time; Mastra agent receives `{ model: savedModelId, apiKey: decryptedUserKey }` object form per Mastra docs.

CI/tests use mocked agent + fixture catalog; no live keys in CI.

**Rationale:** Separates platform secrets (encryption, search) from user-owned LLM credentials.

### 8. Extensibility hooks (future chat / partial import)

**Choice:** Export from `apps/import-agent`:

- `toolRegistry` — register tools by name for alternate workflows
- `ResumeDraft` context object passed between steps (allows future workflow to call `POST /cv/:id/work` per section instead of bulk create)
- `createResumeChatWorkflow()` stub / TODO interface documented but not implemented in v1

**Rationale:** User explicitly requested agent infra for future incremental persistence and chat.

## Risks / Trade-offs

- **[LLM hallucination]** → Mandatory AJV verify loop + user review in editor; never skip validator before create.
- **[Cost/latency]** → Cap verify iterations; use smaller model for repair steps; job timeout (e.g. 5 min) marks job failed.
- **[PDF extraction quality]** → Reject empty text; document scanned-PDF limitation; suggest JSON import alternative.
- **[Web search inaccuracy]** → Tool is optional enrichment only; must not overwrite user-visible facts without citation in job debug log (not shown to user in v1).
- **[Invalid/expired user API key]** → Probe on save; on import failure with auth error, mark job failed and surface “update LLM settings”.
- **[Catalog drift]** → Pin catalog in repo; sync script in monorepo toolchain; re-validation on settings read.
- **[In-memory jobs lost on restart]** → Accept for v1; Redis follow-up when scaling horizontally.
- **[Dependency on import-jsonresume-cv]** → `prepareImportedResume` must exist; implement JSON import first or land both in same release train.

## Migration Plan

1. Add Supabase migration for `import_llm_config` + RLS.
2. Add `packages/import-models` pinned catalog + sync script from Mastra/models.dev.
3. Add `apps/import-agent` workspace + `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` documentation.
4. Ship LLM settings API + dashboard settings UI (provider → model → API key).
5. Ship PDF import endpoints + job store behind `PDF_IMPORT_ENABLED`.
6. Ship gated PDF import UI on new-CV page.
7. Add sample PDF fixtures under `.samples/resumes/pdf/` (via `pnpm samples:pdf`).
8. Rollback: disable feature flag and hide UI; user settings table harmless if unused.

## Open Questions

- Preferred search provider (Tavily vs Brave vs none in v1 prod)?
- Default curated providers for v1 (OpenAI + Anthropic + Google only vs include OpenRouter gateway)?
- Should failed create after valid schema roll back the inserted row (existing create behavior)—confirm orphan-row test from JSON import applies here too.
- SSE vs polling for job status in a follow-up UX polish.
