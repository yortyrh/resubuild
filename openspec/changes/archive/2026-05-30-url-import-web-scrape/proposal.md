## Why

Users often have résumés on personal websites, portfolio pages, or JSON Resume registry profiles—not only as downloadable JSON or PDF files. The previous URL import path only accepted synchronous JSON responses, and PDF import web lookup relied on a server-wide Tavily key. Per-user scrape provider settings and an agent-driven HTML import path unlock onboarding from any public HTTPS résumé URL while keeping API keys in user settings.

> This change retroactively documents work already implemented in the working tree.

## What Changes

- Add **per-user web scrape configuration** (Firecrawl or Tavily) stored encrypted in Supabase with Nest CRUD endpoints under `/web-scrape/config`.
- Extend **`POST /cv/import/from-url`** to return either `{ kind: 'json', data }` for valid JSON Resume endpoints or `{ kind: 'job', jobId }` when HTML/agent conversion is required.
- Add **`runWebsiteImportWorkflow`** in `apps/import-agent` with scrape tools (`fetch-html`, Firecrawl scrape, Tavily extract) and the same verify/repair loop as PDF import.
- Import jobs MAY return **`previewData`** (schema-valid prepared JSON) without creating a CV until the user confirms import in the UI.
- Move **Tavily search for PDF/text import** from server `SEARCH_API_KEY` to the user's web scrape settings (Tavily provider only).
- Replace **`import-website-form`** with **`import-url-form`** on `/dashboard/cv/new/import/url`, including preview, Gravatar option, and job polling.
- Add **web scrape settings** section to AI agent settings UI.
- Update **`pnpm setup:env`** to emit `AI_AGENT_ENCRYPTION_KEY` instead of prompting for `SEARCH_API_KEY`.

## Capabilities

### New Capabilities

- `web-scrape-config`: Per-user Firecrawl/Tavily API key storage, encryption, REST endpoints, settings UI, and wiring into URL import scrape tools.

### Modified Capabilities

- `resume-import-agent`: Website import workflow, scrape tool registry, per-user Tavily for web lookup.
- `cv-rest-api`: URL import dual response shape, job `previewData`, `/web-scrape/config` endpoints.
- `cv-pdf-import`: Job status includes optional `previewData`; search API resolved from user web scrape settings.
- `web-application`: Dedicated URL import route, preview-before-create UX, web scrape settings in AI agent page.
- `database-cv-rls`: `web_scrape_config` table with RLS.
- `monorepo-and-toolchain`: Server env documentation (`AI_AGENT_ENCRYPTION_KEY`; no server Tavily key).
- `e2e-testing`: URL import catalog entry reflects JSON fast path vs agent job behavior.

## Impact

- **New**: `apps/api/src/web-scrape/*`, `apps/import-agent` scrape tools + `website-import.workflow.ts`, `apps/web` URL import page and `web-scrape-settings.tsx`, Supabase migration `20260530120000_web_scrape_config.sql`.
- **Modified**: `ImportService`, `ImportJobStore`, `import-url-form`, `ai-agent-settings`, `setup-local-env.sh`, README.
- **Removed**: `import-website-form.tsx` (replaced by richer URL import form).
- **Env**: `SEARCH_API_KEY` removed from server setup; Tavily/Firecrawl keys are per-user in the app UI.
