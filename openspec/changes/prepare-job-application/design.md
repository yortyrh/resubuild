## Context

Resumind persists CVs in normalized Supabase tables and already runs **Mastra workflows** for PDF import (`apps/import-agent`, gated by the user's active AI agent account per `ai-agent-settings-menu`). The dashboard supports section-by-section editing and (in flight) API-side HTML/PDF export via `cv-html-view-pdf-export`. There is no concept of job postings, application packages, CV clones, or AI chat beyond import job polling.

The user wants a **single simplified flow**—Prepare Application—not a job board (no search, favorites, or email alerts). Input is multimodal (URL, text, PDF, screenshot + optional user message). Output is a tailored CV clone, presentation letter, and an iterative chat to refine both. Application clones must stay out of the main CV library until promoted.

Supabase Realtime is currently disabled in `supabase/config.toml`; chat UX benefits from live message delivery once enabled.

## Goals / Non-Goals

**Goals:**

- One guided flow from job posting → best CV match → cloned tailored CV + cover letter.
- Deterministic persistence: `job_application` record, clone linked to `source_cv_id`, chat history durable in Postgres.
- Tailoring operations v1: update `basics.label`, Markdown bold in summaries/highlights, move bullets between `highlights` and `inactive_highlights`.
- Reuse active AI agent account credentials and Mastra patterns; extend `apps/import-agent` rather than duplicating agent infrastructure.
- Application workspace: chat + letter preview (copy) + PDF export + full CV editor on clone.
- `GET /cv` excludes non-promoted application clones; promote action makes clone visible in library.

**Non-Goals:**

- Job search, saved searches, favorites, notification emails.
- Scraping arbitrary job sites without user-provided content fallback (URL fetch may fail; user can paste text).
- Auto-merge tailored clone back into source CV.
- Separate LLM billing/config per feature (one global active AI agent account for v1, shared across PDF import and Prepare Application).
- OCR quality guarantees for screenshot-only postings (best-effort vision step; user can paste text if extraction fails).
- Real-time streaming tokens from LLM (chat returns complete assistant messages per turn; Realtime syncs persisted messages only).

## Decisions

### 1. Domain model: `job_application` + flagged CV clones

**Choice:**

| Entity                    | Purpose                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `job_application`         | User, status, job metadata (title, company, raw text, source type), `source_cv_id`, `tailored_cv_id`, `cover_letter` text, timestamps |
| `job_application_message` | Chat turns: `role` (user/assistant/system), `content`, optional structured `actions` jsonb (patches applied)                          |
| `cv` extensions           | `source_cv_id uuid null`, `kind text` (`primary` \| `application_clone`), `visible_in_library boolean default true`                   |

Clones created with `kind = application_clone`, `source_cv_id` set, `visible_in_library = false`. Promote sets `visible_in_library = true` (kind unchanged for audit).

**Rationale:** Keeps all CV editing/export machinery unchanged—clone is a normal CV row with flags. Avoids parallel editor code paths.

**Alternatives:**

- Store tailored JSON only on `job_application` — rejected; would bypass normalized editor and export.
- Soft-delete source linkage — rejected; explicit `source_cv_id` supports UI lineage.

### 2. Highlight activation via `inactive_highlights` jsonb

**Choice:** Add `inactive_highlights jsonb not null default '[]'` to `cv_work`, `cv_volunteer`, `cv_project`. Active bullets = `highlights` array; inactive = stored separately. Export/assembly includes only `highlights` (JSON Resume compliant). Item PATCH accepts optional `inactiveHighlights` alongside `highlights`.

**Rationale:** Preserves JSON Resume schema; no `{ text, active }` objects in standard export. Reversible toggles without data loss.

**Alternatives:**

- Markdown comments / strikethrough in highlight text — rejected; pollutes export and editor.
- Filter at render-only layer — rejected; editor and AI need persisted state.

### 3. Mastra workflow in `apps/import-agent`

**Choice:** Export `createPrepareApplicationWorkflow()` with steps:

1. **Normalize job posting** — branch on input type:
   - URL: HTTP fetch + readability extract (timeout, SSRF guard allowlist or generic fetch with size cap)
   - Text: use as-is
   - PDF: reuse `extractPdfTextTool`
   - Image: vision-capable model step (same active AI agent account) → plain text job description
2. **Summarize job** — structured fields: title, company, requirements[], keywords[]
3. **Rank CVs** — load user CV headers + section summaries (work titles, skill keywords); LLM picks `source_cv_id` with rationale; respect user message as tie-breaker
4. **Clone** — server-side deep copy normalized rows → new `cv` + children
5. **Tailor clone** — LLM outputs patch list: `basics.label`, bold Markdown fragments in summaries/highlights, highlight ids/text to deactivate (move to `inactive_highlights`)
6. **Draft letter** — presentation letter from job summary + tailored CV assembly
7. **Persist** — create `job_application`, initial assistant message summarizing actions

**Chat turns (sync HTTP):** `POST /applications/:id/chat` loads application context + recent messages, runs shorter Mastra agent with tools: `updateCoverLetter`, `patchTailoredCv` (same patch applier as step 5), `explainChanges`. Append user + assistant messages; broadcast via Realtime optional.

**Rationale:** Mirrors PDF import architecture; tools are unit-testable; chat reuses tailor applier.

**Alternatives:**

- Inline all logic in Nest service — rejected for testability.
- Full autonomous agent without structured patch step — rejected; need validated CV mutations.

### 4. Async initial prepare + sync chat

**Choice:**

- `POST /applications/prepare` (multipart: optional `url`, `text`, `file` pdf|image, optional `message`) → `{ applicationId, status: queued }` (202)
- Background runner executes workflow (in-memory job map like PDF import v1)
- `GET /applications/:id` → status, job progress, ids, cover letter when ready
- Chat endpoints synchronous (single turn, may take 10–30s) with loading UI

**Rationale:** Initial prepare is multi-step; chat turns are one LLM call but still need timeout headroom.

### 5. CV list filtering

**Choice:** `CvService.findAll` adds `.eq('visible_in_library', true)` (or `.or('kind.eq.primary,visible_in_library.eq.true')`). `GET /cv/:id` still returns clones by id for editor deep links. New `GET /applications` lists application records for history.

**Rationale:** Minimal API surface change; dashboard stays clean.

### 6. Letter export

**Choice:** Extend export module with `GET /applications/:id/export/letter/html` and `.../pdf` using a small letter HTML template (not JSON Resume). CV export uses existing `GET /cv/:id/export/*` on `tailored_cv_id`.

**Dependency:** Requires `cv-html-view-pdf-export` merged first (Puppeteer pipeline).

### 7. Supabase Realtime for chat

**Choice:** Enable `[realtime] enabled = true` in `supabase/config.toml`. Subscribe client to `job_application_message` inserts filtered by `application_id` (RLS-scoped). Fallback to refetch after chat POST if Realtime unavailable.

**Rationale:** User explicitly requested Realtime; reduces polling complexity for multi-tab chat.

**Migration note:** Production Supabase project must enable Realtime for the messages table publication.

### 8. AI agent credential gate

**Choice:** Reuse `AiAgentCredentialService.getActiveCredentials(user)` from `ai-agent-settings-menu`. `POST /applications/prepare` and chat require the same validation as PDF import. UI links to **AI agent settings** (`/dashboard/settings/ai-agent`) or the dashboard user menu when no active account is configured.

**Rationale:** One credential setup for all Mastra features in v1; avoids reviving import-only config.

## Risks / Trade-offs

- **[Risk] URL fetch SSRF / ToS** → Allow only HTTPS, size/time limits, no internal IP ranges; document that pasted text is preferred when fetch fails.
- **[Risk] Job page HTML noise** → Extraction + LLM summarize step; surface raw extract for user edit before tailor if confidence low (future).
- **[Risk] Wrong CV selected** → Show rationale + let user pick alternate base CV in workspace before tailor (v1.1); v1 logs `source_cv_id` rationale in first assistant message.
- **[Risk] LLM corrupts CV schema** → Apply patches through validated DTOs + `ResumeSchemaValidator` after each tailor/chat mutation; reject invalid patches.
- **[Risk] Realtime misconfiguration** → Chat still works via REST; Realtime is enhancement.
- **[Trade-off] In-memory job store** → Same as PDF import; Redis/BullMQ deferred.

## Migration Plan

1. Deploy migration: CV columns, `inactive_highlights`, `job_application`, `job_application_message`, indexes, RLS, Realtime publication for messages.
2. Deploy API with feature flag `APPLICATION_PREPARE_ENABLED` default true in dev.
3. Deploy web routes behind nav link.
4. Enable Realtime in hosted Supabase dashboard if not auto-enabled.
5. Rollback: disable flag; new tables unused; CV columns nullable/no-op for existing rows.

## Open Questions

- Should v1 allow user to **pick base CV** before tailor, or only AI pick? (Proposal: AI pick with manual override in first chat message or follow-up task.)
- Maximum size for screenshot upload (propose 5 MB, same as PDF import).
- Letter language: match job posting language detected by LLM, or user profile locale? (Default: job posting language.)
