## Context

The dashboard **New CV** button links to `/dashboard/cv/new`, which renders a client tabbed page (`NewCvPageClient`) with three modes: PDF import, manual create, and JSON import (which also embeds URL import via `importCvFromUrl`). There is no Markdown import. URL import exists at `POST /cv/import/from-url` but only accepts responses whose `Content-Type` includes `json` or `text/plain`—JSON Resume Registry profile pages such as `https://registry.jsonresume.org/thomasdavis` return HTML while the raw JSON lives at the same path with a `.json` suffix.

The PDF import pipeline in `apps/import-agent` already converts unstructured text → JSON Resume via an LLM agent with schema repair loops. Markdown résumés are text-first sources that fit the same pipeline after reading the file as UTF-8.

## Goals / Non-Goals

**Goals:**

- Give each create/import path a dedicated, bookmarkable App Router URL.
- Replace the single **New CV** button with a dropdown listing all paths (shadcn `DropdownMenu`, same visual language as other dashboard menus).
- Add Markdown (`.md`, `.markdown`) import using the existing async job model and per-user LLM config gate.
- Add a dedicated **Import from website** page for personal CV URLs, with server-side resolution for JSON Resume Registry profile URLs.
- Preserve existing import semantics: nothing persisted until explicit confirm; shared file-upload component for file-based imports.

**Non-Goals:**

- Word (`.docx`) import — deferred to a follow-up change when test fixtures are available.
- HTML scraping of arbitrary personal websites—v1 supports HTTPS URLs that return JSON Resume JSON (direct or via registry `.json` resolution) plus LLM imports for file formats.
- OCR for scanned PDFs (unchanged).
- Import into an existing CV (create-only).
- Changing item-level editor routes or CV list card layout beyond the New CV control.

## Decisions

### 1. Route tree under `/dashboard/cv/new/`

**Choice:**

| Route                               | Purpose                                          |
| ----------------------------------- | ------------------------------------------------ |
| `/dashboard/cv/new`                 | Redirect (307) to `/dashboard/cv/new/import/pdf` |
| `/dashboard/cv/new/create`          | Manual basics form                               |
| `/dashboard/cv/new/import/pdf`      | PDF upload + job polling                         |
| `/dashboard/cv/new/import/json`     | JSON file / edit dialog                          |
| `/dashboard/cv/new/import/website`  | URL input for personal CV / registry             |
| `/dashboard/cv/new/import/markdown` | Markdown file upload + job polling               |

**Rationale:** Keeps all create flows under the existing `new` namespace; `/import/*` subpaths group file/URL imports; `/create` is distinct from imports.

**Alternative considered:** Flat routes (`/dashboard/cv/import/pdf`) — rejected because it breaks the mental model of "new CV" flows and requires more dashboard link updates.

### 2. Shared layout for create/import pages

**Choice:** Add `apps/web/src/app/dashboard/cv/new/layout.tsx` with page title ("Create a new CV"), subtitle, and optional back/cancel to `/dashboard`. Each child route renders only its form component.

**Rationale:** Removes duplicated chrome; child pages stay thin server or client wrappers.

### 3. Dashboard dropdown instead of direct link

**Choice:** Replace `<Button asChild><Link href="...">New CV</Link></Button>` in `cv-list.tsx` with shadcn `DropdownMenu`: trigger shows "New CV" + chevron; menu items are `Link` rows for each route. Empty-state **Create CV** button uses the same dropdown.

**Rationale:** Matches the reference dropdown pattern; discoverability without cramming tabs on one page.

### 4. Markdown import reuses PDF job infrastructure

**Choice:**

- `POST /cv/import/markdown` — multipart `file`, MIME `text/markdown` or `text/plain`, max 512 KB; read UTF-8 text; run `runTextImportWorkflow` (shared with PDF after text extraction).
- Returns `{ jobId }` (202) and polls `GET /cv/import/:jobId` (existing endpoint).

**Rationale:** One job store, one polling UX, one LLM gate; avoids new status endpoints.

**Alternative considered:** Synchronous import for Markdown — rejected because LLM runs can exceed HTTP timeouts.

### 5. Generalize import-agent text workflow

**Choice:** Refactor `runPdfImportWorkflow` into `runTextImportWorkflow({ sourceText, ... })` used by PDF (after `extractPdfText`) and Markdown (file body). Keep PDF-specific extraction tool; PDF workflow becomes a thin wrapper.

**Rationale:** Single prompt/repair loop; Word import can reuse the same abstraction in a future change.

### 6. Website URL resolution for JSON Resume Registry

**Choice:** In `importFromUrl`, before fetch:

1. Parse and validate URL (`validateImportUrl` — unchanged SSRF rules).
2. If `hostname === 'registry.jsonresume.org'` and pathname does not end with `.json`, rewrite to `${pathname}.json` (preserve query string).
3. Fetch with 10 s timeout; require parseable JSON; `prepareImportedResume` + schema validation (unchanged).

**Rationale:** Registry profile URLs are the primary user-facing link; `.json` suffix is the documented raw endpoint ([example](https://registry.jsonresume.org/thomasdavis.json)).

**Alternative considered:** Client-side URL rewriting — rejected to keep one server-side resolution path and avoid leaking fetch logic.

### 7. Split URL import out of JSON tab

**Choice:** Remove URL input from `ImportCvForm`; dedicated `ImportWebsiteForm` on `/dashboard/cv/new/import/website` calling `POST /cv/import/from-url` then `createCv`.

**Rationale:** Website import is a distinct user intent; JSON tab focuses on files and manual JSON edit.

## Risks / Trade-offs

| Risk                                   | Mitigation                                                        |
| -------------------------------------- | ----------------------------------------------------------------- |
| Five routes to maintain                | Shared layout + reuse existing form components with minimal props |
| Registry URL pattern changes           | Resolver limited to known host; generic JSON URLs still work      |
| SSRF on website import                 | Existing `validateImportUrl` blocks IPs and non-HTTPS             |
| Breaking `/dashboard/cv/new` bookmarks | 307 redirect to PDF import default                                |

## Migration Plan

1. Add new routes and layout; wire forms to existing components.
2. Add API endpoints and agent workflow generalization.
3. Replace dashboard button with dropdown.
4. Redirect `/dashboard/cv/new` → `/dashboard/cv/new/import/pdf`.
5. Remove tabbed `NewCvPageClient` (or reduce to redirect-only).
6. Update unit tests and E2E for new endpoints and registry URL resolution.

Rollback: revert routes; restore tabbed page; new API routes unused but harmless if not called.

## Open Questions

- Default redirect target: PDF import (matches current tab default) vs manual create — **defaulting to PDF** unless product prefers manual.
- Max Markdown file size: **512 KB** proposed (résumé-sized); confirm if larger needed.
- Whether website import should call `createCv` client-side (like JSON) or server-side create in one step — **keep client-side `createCv`** after preview for consistency with JSON import and Gravatar option reuse.
