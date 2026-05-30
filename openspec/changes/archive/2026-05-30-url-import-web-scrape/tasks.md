## 1. Database — web scrape config

- [x] 1.1 Add Supabase migration `20260530120000_web_scrape_config.sql` with RLS policies
- [x] 1.2 Implement `WebScrapeRepository` and encrypted key storage reusing AI agent encryption helper

## 2. API — web scrape module

- [x] 2.1 Create `WebScrapeModule` with `GET/PUT/DELETE /web-scrape/config`
- [x] 2.2 Add `SaveWebScrapeConfigDto` validation (provider enum, non-empty apiKey on save)
- [x] 2.3 Register module in `AppModule`

## 3. Import agent — scrape tools and website workflow

- [x] 3.1 Implement `fetch-html.tool.ts` with URL validation
- [x] 3.2 Implement `firecrawl-scrape.tool.ts` and `tavily-extract.tool.ts`
- [x] 3.3 Implement `website-import-tools.ts` builder and colocated `scrape-tools.test.ts`
- [x] 3.4 Implement `runWebsiteImportWorkflow` with verify/repair loop
- [x] 3.5 Export workflow and types from `apps/import-agent` index
- [x] 3.6 Register tools in `tool-registry.ts`

## 4. API — URL import dual path

- [x] 4.1 Extend `importFromUrl` for JSON fast path vs HTML agent job (`ImportFromUrlResponse`)
- [x] 4.2 Add `runWebsiteJob` and `finishWebsitePreviewJob` with `previewData` on success
- [x] 4.3 Extend `ImportJobStore` and `GET /cv/import/:jobId` response with `previewData`
- [x] 4.4 Resolve Tavily search key from user web scrape config for PDF/text import (remove server `SEARCH_API_KEY`)
- [x] 4.5 Update `import.service.spec.ts` for JSON, HTML job, and preview flows
- [x] 4.6 Wire `WebScrapeService` into `ImportModule`

## 5. Web — URL import UI

- [x] 5.1 Add `/dashboard/cv/new/import/url` page
- [x] 5.2 Create `import-url-form.tsx` with fetch, poll, preview, Gravatar option, and colocated tests
- [x] 5.3 Remove legacy `import-website-form.tsx`
- [x] 5.4 Update `import-cv-form.tsx`, dropdown, and copy for URL import route
- [x] 5.5 Extend `api.ts` with `importCvFromUrl` discriminated response and web scrape helpers
- [x] 5.6 Add `web-scrape-queries.ts` and query keys

## 6. Web — settings

- [x] 6.1 Add `web-scrape-settings.tsx` to AI agent settings page
- [x] 6.2 Link URL import form to settings with return path

## 7. Toolchain and docs

- [x] 7.1 Update `scripts/setup-local-env.sh` — `AI_AGENT_ENCRYPTION_KEY`, remove `SEARCH_API_KEY` prompt
- [x] 7.2 Update `apps/api/.env.example` and README for UI-first scrape/search keys
- [x] 7.3 Update `import-agent` index exports

## 8. Verification

- [x] 8.1 Run unit tests for `apps/api`, `apps/import-agent`, and `apps/web` with `--run`

## 9. E2E test impact

- [x] 9.1 **Must pass unchanged** — `import URL validation (local Supabase)` (`cv-import-url`): invalid URL still returns 400
- [x] 9.2 **Update required** — none (catalog description clarified; assertions unchanged)
- [x] 9.3 **New scenarios deferred** — full HTML URL agent import E2E (requires live LLM + scrape keys; covered by unit tests and manual smoke)
