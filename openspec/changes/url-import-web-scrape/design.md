## Context

URL import existed as a synchronous JSON-only fetch (`POST /cv/import/from-url`). PDF import already used a Mastra agent with optional Tavily web lookup via server env `SEARCH_API_KEY`. Users wanted HTML portfolio pages imported the same way as PDFs, with scrape quality improved by Firecrawl or Tavily when configured.

## Goals / Non-Goals

**Goals:**

- Fast path for JSON Resume URLs (registry profiles, raw `.json` endpoints) without LLM.
- Agent path for HTML pages with preview-before-create (no automatic CV row).
- Per-user encrypted Firecrawl/Tavily keys; no server-wide search/scrape secrets.
- Reuse PDF import verify/repair tools (schema validate, date normalize, web lookup).

**Non-Goals:**

- Crawling multi-page sites or authenticated pages.
- Automatic CV creation on website import success (user confirms after preview).
- Replacing `import-llm-config` routes or renaming them in v1 (AI agent settings UI wraps existing LLM config).

## Decisions

### Dual response from `importFromUrl`

**Choice:** Return discriminated union `{ kind: 'json', data } | { kind: 'job', jobId }`.

**Rationale:** JSON endpoints stay synchronous and need no LLM. HTML triggers async agent work without blocking HTTP timeouts.

**Alternatives considered:** Always enqueue a job (worse UX for registry URLs); always synchronous with long timeout (fragile).

### Preview jobs without `cvId`

**Choice:** Website import jobs set `previewData` on success; client calls `createCv` only after user clicks Import.

**Rationale:** Matches JSON/file import preview pattern; avoids orphan CVs when user abandons after fetch.

### Scrape provider selection

**Choice:** User picks `firecrawl` or `tavily` in settings. Agent tools use configured provider when present; otherwise `fetch-html` (raw HTML).

**Rationale:** Firecrawl excels at markdown extraction; Tavily extract doubles as search key for web lookup tool.

### Search API key source

**Choice:** PDF and text import resolve Tavily search key from user's web scrape config (`provider === 'tavily'`), not `SEARCH_API_KEY` env.

**Rationale:** Aligns all optional web enrichment with user-supplied keys; simplifies local dev setup.

### Encryption env rename

**Choice:** `setup-local-env.sh` writes `AI_AGENT_ENCRYPTION_KEY` (reads legacy `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` when present).

**Rationale:** Single encryption key for LLM and web scrape credentials; README reflects UI-first key configuration.

## Risks / Trade-offs

- **HTML without AI agent config** → 400 with setup message (JSON still works).
- **No scrape provider** → raw HTML only; quality varies by site.
- **In-memory job store** → same TTL/limitation as PDF jobs; preview jobs also ephemeral.

## Migration Plan

1. Apply Supabase migration `20260530120000_web_scrape_config.sql`.
2. Run `pnpm setup:env` to rotate/write `AI_AGENT_ENCRYPTION_KEY` if needed; users re-save keys in settings.
3. Remove reliance on `SEARCH_API_KEY` in deployment env (optional key no longer read).

## Open Questions

- E2E coverage for full HTML agent import deferred (requires live LLM + scrape keys); URL validation E2E remains.
