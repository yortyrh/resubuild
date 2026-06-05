## Why

This change retroactively documents work already implemented in the working tree.

Three follow-up fixes were needed after the `upgrade-mastra-v1-and-deps` change shipped:

1. **Source-text profile filter (correctness / safety).** `discoverSocialProfilesTool` accepts whatever URL a Tavily search returns for each platform, including profiles that belong to a _different_ person than the candidate. The bug surfaced in production: a candidate whose resume listed `jane` (in the source PDF) had a discovered LinkedIn URL that resolved to a different `jane-doe`. The match should be evidence-based: a discovered username must appear in the candidate's actual source text.
2. **PDF hyperlink preservation (extraction quality).** `pdf-parse@2` defaults to stripping icons and links to plain text, which destroys the icon-to-URL mapping (e.g. a LinkedIn icon next to the candidate's name). The LLM draft step then has no way to recover which icon maps to which URL, and the `basics.profiles` it produces is incomplete. Enabling `parseHyperlinks: true` returns the link annotations as Markdown inline links (`[yorty](https://linkedin.com/in/yorty)`) so the LLM can pick them up.
3. **Mastra v1 `structuredOutput` removal (v1 contract).** After the v1 upgrade, the `agent.generate(prompt, { structuredOutput: { schema, ... } })` calls in `pdf-import.workflow.ts`, `website-import.workflow.ts` (draft + repair), and `prepare-application.workflow.ts` no longer function as expected under v1.38 (the v1 contract returns the model output directly via `response.text`; the `structuredOutput` option is not on the supported `generate()` overload). We still need a JSON object from the agent, so the JSON is parsed from the response text as before (which is exactly what the existing `parseJsonFromAgentText` / manual `indexOf('{')` block already does). The diff drops the `structuredOutput` option.

These three fixes were implemented together because they share the same code paths and the same test surface (`apps/import-agent`).

## What Changes

- **PDF text extraction** — `apps/import-agent/src/tools/extract-pdf-text.tool.ts` calls `parser.getText({ parseHyperlinks: true })` so that hyperlink annotations in the PDF are returned as Markdown inline links. The shape contract (`{ text, total }`) is unchanged.
- **Social profile discovery source filter** — `apps/import-agent/src/tools/discover-social-profiles.tool.ts` accepts an optional `sourceText` field on its input. When provided, candidates whose derived `username` does not appear in the source text (case-insensitive, word-boundary aware regex) are rejected before they can be merged into `basics.profiles`. The filter is opt-in; legacy callers (or callers that do not have access to the source text, e.g. tests that exercise only the platform validation logic) see no behavior change.
- **Workflow signature updates** — `applySocialProfileDiscovery` takes a single input object (`{ draft, searchApiKey, onProgress?, sourceText? }`) instead of three positional args. The PDF text import workflow passes `sourceText: input.sourceText` so the filter is engaged for PDF imports. The website import workflow does not yet have a structured source text (it scrapes a URL), so it passes nothing — the filter is silently a no-op there. The `prepare-application.workflow.ts` JSON draft step is unaffected.
- **`structuredOutput` removal** — `pdf-import.workflow.ts`, `website-import.workflow.ts` (the `generateWebsiteDraft` and `generateRepair` helpers), and `prepare-application.workflow.ts` no longer pass `{ structuredOutput: { schema: { type: 'object', additionalProperties: true } } }` to `agent.generate(prompt)`. They rely on the existing JSON-in-text parsing path. `website-import.workflow.ts`'s `generateWebsiteDraft` keeps its `maxSteps: MAX_AGENT_STEPS` option.
- **Unit tests** — `extractPdfTextTool` test covers the new `parseHyperlinks: true` argument. `discoverSocialProfilesTool` tests add two scenarios: (a) candidate whose username does not appear in source is rejected, (b) candidate whose username does appear is accepted. No test file is renamed, no test file is moved; the colocated `*.test.ts` files are extended.
- No new public API, no DB changes, no new dependency, no breaking signature change for callers that consume `applySocialProfileDiscovery` indirectly through the import workflows.

## Capabilities

### New Capabilities

_None._ This change is a correctness + extraction-quality fix to existing capabilities. No new spec-level capability is introduced.

### Modified Capabilities

- `import-social-profile-discovery`: Add a requirement that the discovery tool MAY filter discovered candidates against the source text (when provided) using a word-boundary aware username match. When the source-text filter is active, candidates whose derived username does not appear in the source are rejected. When `sourceText` is absent, the tool's behavior is unchanged.
- `cv-pdf-import`: Add a requirement that PDF text extraction preserves hyperlink annotations as Markdown inline links so the LLM draft step can recover icon-to-URL mappings. This directly improves the quality of `basics.profiles` produced by PDF import jobs.
- `resume-import-agent`: Update the requirement covering `agent.generate` to reflect that, under Mastra v1, the workflow relies on parsing JSON out of `response.text` and does not use the `structuredOutput` option on `generate()`. The `agent.id` requirement added in the v1 upgrade change is preserved. This is a clarification of the v1 contract, not a new constraint.

## Impact

- `apps/import-agent/src/tools/extract-pdf-text.tool.ts` — pass `{ parseHyperlinks: true }` to `parser.getText(...)`.
- `apps/import-agent/src/tools/discover-social-profiles.tool.ts` — add `sourceText?: string` to `DiscoverSocialProfilesInput`; add a `buildSourceMatcher()` helper that returns a `(username) => boolean` predicate (or `null` when source text is empty/absent); call the predicate inside the per-platform loop and `continue` on a miss.
- `apps/import-agent/src/tools/discover-social-profiles.tool.test.ts` — add two test cases for the source-text filter (reject, accept).
- `apps/import-agent/src/pdf-import.test.ts` — add one test case verifying `parseHyperlinks: true` is passed.
- `apps/import-agent/src/workflows/social-profile-discovery.ts` — change signature to `applySocialProfileDiscovery({ draft, searchApiKey, onProgress?, sourceText? })`; forward `sourceText` to the tool.
- `apps/import-agent/src/workflows/pdf-import.workflow.ts` — refactor `runTextImportWorkflow` to call an inner helper that takes the `errors` accumulator (so the source-text plumbing is a one-line change at the call site to `applySocialProfileDiscovery`); pass `sourceText: input.sourceText`; drop the `structuredOutput` option from the `agent.generate(prompt, ...)` call inside `generateJsonFromPrompt`.
- `apps/import-agent/src/workflows/website-import.workflow.ts` — drop the `structuredOutput` option from both `agent.generate(prompt, ...)` calls (the `generateWebsiteDraft` agent and the `generateRepair` agent); switch the `applySocialProfileDiscovery(draft, searchApiKey, onProgress)` call to the new object form (no `sourceText` — website import has no extracted text to filter against).
- `apps/import-agent/src/workflows/prepare-application.workflow.ts` — drop the `structuredOutput` option from the `agent.generate(prompt, ...)` call in `generateJsonFromPrompt`.
- No `package.json` change. No `pnpm-lock.yaml` change. No CI workflow change.
- No Supabase migration, no RLS change, no new env var.
- No new e2e spec; the existing import flows are exercised by unit tests in `apps/import-agent/src/**/*.test.ts`.
- Tests remain colocated next to source files (per the workspace rule).
