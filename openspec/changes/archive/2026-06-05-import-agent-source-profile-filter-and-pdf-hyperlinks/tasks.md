## 1. PDF text extraction preserves hyperlink annotations

- [x] 1.1 In `apps/import-agent/src/tools/extract-pdf-text.tool.ts` call `parser.getText({ parseHyperlinks: true })` and keep the `{ text, total }` shape contract
- [x] 1.2 In `apps/import-agent/src/pdf-import.test.ts` add a test verifying that `parseHyperlinks: true` is passed to `getText`

## 2. Social profile discovery filters by source text

- [x] 2.1 In `apps/import-agent/src/tools/discover-social-profiles.tool.ts` add `sourceText?: string` to `DiscoverSocialProfilesInput`
- [x] 2.2 In `apps/import-agent/src/tools/discover-social-profiles.tool.ts` add a `buildSourceMatcher` helper that returns a `(username) => boolean` predicate (or `null` when source text is empty/absent)
- [x] 2.3 In `apps/import-agent/src/tools/discover-social-profiles.tool.ts` consult the matcher in the per-platform loop and `continue` on a miss
- [x] 2.4 In `apps/import-agent/src/tools/discover-social-profiles.tool.test.ts` add a test rejecting a candidate whose username does not appear in `sourceText`
- [x] 2.5 In `apps/import-agent/src/tools/discover-social-profiles.tool.test.ts` add a test accepting a candidate whose username does appear in `sourceText`

## 3. Workflow signature update and source-text plumbing

- [x] 3.1 In `apps/import-agent/src/workflows/social-profile-discovery.ts` change `applySocialProfileDiscovery` to take a single input object `{ draft, searchApiKey, onProgress?, sourceText? }` and forward `sourceText` to `discoverSocialProfilesTool`
- [x] 3.2 In `apps/import-agent/src/workflows/pdf-import.workflow.ts` refactor `runTextImportWorkflow` to call an inner helper `runTextImportWorkflowInner(input, errors)` so the public signature is preserved
- [x] 3.3 In `apps/import-agent/src/workflows/pdf-import.workflow.ts` pass `sourceText: input.sourceText` to `applySocialProfileDiscovery` for the PDF text import path
- [x] 3.4 In `apps/import-agent/src/workflows/website-import.workflow.ts` update the `applySocialProfileDiscovery` call site to the new object form (no `sourceText`)

## 4. Drop `structuredOutput` from v1 agent calls

- [x] 4.1 In `apps/import-agent/src/workflows/pdf-import.workflow.ts` drop `{ structuredOutput: { schema: ... } }` from the `agent.generate(prompt, ...)` call inside `generateJsonFromPrompt`
- [x] 4.2 In `apps/import-agent/src/workflows/website-import.workflow.ts` drop `{ structuredOutput: { schema: ... } }` from the `agent.generate(prompt, ...)` call inside `generateWebsiteDraft`; keep `{ maxSteps: 12 }`
- [x] 4.3 In `apps/import-agent/src/workflows/website-import.workflow.ts` drop `{ structuredOutput: { schema: ... } }` from the `agent.generate(prompt, ...)` call inside `generateRepair`
- [x] 4.4 In `apps/import-agent/src/workflows/prepare-application.workflow.ts` drop `{ structuredOutput: { schema: ... } }` from the `agent.generate(prompt, ...)` call inside `generateJsonFromPrompt`

## 5. Verification

- [x] 5.1 Run `pnpm --filter @resumind/import-agent typecheck` and resolve any type errors
- [x] 5.2 Run `pnpm --filter @resumind/import-agent test -- --run` and confirm all unit tests pass
- [x] 5.3 Run `pnpm format:check` and resolve any formatting drift
- [x] 5.4 Run `pnpm lint` (Biome) and resolve any lint errors
- [x] 5.5 Run `pnpm --filter @resumind/api typecheck` and confirm the import-agent API surface still type-checks
- [x] 5.6 Run `pnpm --filter @resumind/web typecheck` and confirm the web app still type-checks

## E2E test impact

### Must pass unchanged

- None. No e2e spec exercises the social-profile discovery tool or the PDF hyperlink extraction path directly. The `apps/api/test/e2e/local-supabase.e2e-spec.ts` scenarios that touch `POST /cv/import/pdf` are happy-path import scenarios that do not depend on the source-text filter or the Markdown-link extraction.

### Update required

- None. The e2e specs that import PDFs do not assert on the format of the extracted text or on the contents of `basics.profiles` from social profile discovery. They only assert on the schema-validity of `previewData` and on the create-CV flow, both of which are unchanged by this change.

### Add

- None. This change is a logic / extraction fix in `apps/import-agent`; the new behavior is exercised by the colocated `*.test.ts` files. Adding an e2e spec would duplicate the unit-test coverage and require local Supabase + a fixture PDF with hyperlink annotations, which is not justified for this size of change.
