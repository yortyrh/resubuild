# Import agent

Mastra-based PDF import workflows and reusable resume verification tools.

## Exports

- `createPdfImportWorkflow({ modelId, apiKey })` — PDF extract → draft → verify/repair → finalize hook
- `toolRegistry` — extract PDF text, validate JSON Resume schema, normalize dates, optional web lookup, social profile discovery
- `createWebProviderPool({ tavily, firecrawl, brave })` — round-robin web search / page extraction across the configured providers, with fallback and an out-of-credit cooldown

## Document extraction

PDF and DOCX are converted to Markdown with `@firecrawl/anydoc` (native, local). Scanned or image-only PDF pages use anydoc's hosted OCR (`ocr: 'hosted'`, Firecrawl Parse). PDF link annotations are read with `pdfjs-dist` and appended, so icon links (LinkedIn, GitHub…) keep their URLs. When anydoc still yields no text, the user's vision model transcribes the rendered pages (`pdfjs-dist` + `@napi-rs/canvas`).

- Shared workflow context types for future chat or incremental section workflows

## Social profile discovery

When the deployment configures a web search provider (`TAVILY_API_KEY`, `FIRECRAWL_API_KEY` or `BRAVE_SEARCH_API_KEY` in the API env), agent imports (PDF, Markdown, free text, image, and HTML URL) run an optional discovery step after schema validation. The agent searches for LinkedIn, GitHub, X, and other supported networks and merges validated profile URLs into `basics.profiles` without overwriting existing entries.

Discovery requires a search provider and a non-empty `basics.name` in the draft. Review auto-discovered profiles in Preview or Edit before Save—they are draft suggestions, not verified ownership.

## Manual smoke

1. Configure import LLM settings at `/dashboard/settings/import-llm` (provider → model → API key).
2. On `/dashboard/cv/new`, open **Import PDF**, upload a sample from `.samples/resumes/pdf/`, and wait for the editor redirect.
3. Verify extracted sections in the editor and adjust any hallucinated fields manually.

## Extension notes

Future workflows can import `toolRegistry` and pass alternate finalize callbacks (for example per-section CRUD instead of bulk create).
