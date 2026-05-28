# Import agent

Mastra-based PDF import workflows and reusable resume verification tools.

## Exports

- `createPdfImportWorkflow({ modelId, apiKey })` — PDF extract → draft → verify/repair → finalize hook
- `toolRegistry` — extract PDF text, validate JSON Resume schema, normalize dates, optional web lookup
- Shared workflow context types for future chat or incremental section workflows

## Manual smoke

1. Configure import LLM settings at `/dashboard/settings/import-llm` (provider → model → API key).
2. On `/dashboard/cv/new`, open **Import PDF**, upload a sample from `.samples/resumes/pdf/`, and wait for the editor redirect.
3. Verify extracted sections in the editor and adjust any hallucinated fields manually.

## Extension notes

Future workflows can import `toolRegistry` and pass alternate finalize callbacks (for example per-section CRUD instead of bulk create).
