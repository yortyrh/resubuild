## Context

The `upgrade-mastra-v1-and-deps` change shipped in early June 2026 (commit `3b30450`) and bumped `@mastra/core` to v1.38.0. The change kept `agent.generate(prompt, { structuredOutput: { schema, model? }, maxSteps? })` calls intact, on the assumption that v1 still supports that signature. In practice, three follow-on issues surfaced in production / CI:

1. **v1.38 `structuredOutput` overload.** The `generate()` overload that accepts `structuredOutput` is not present on the public v1.38 surface for `Agent` in our configuration. Calls like `agent.generate(prompt, { structuredOutput: { schema: { type: 'object', additionalProperties: true } } })` either throw a type error (caught by `tsc`) or get silently ignored at runtime (the agent returns plain text, the JSON parse fails). The repair loop in `pdf-import.workflow.ts` and the draft step in `website-import.workflow.ts` and `prepare-application.workflow.ts` are all affected.
2. **Wrong-person social profile discovery.** The existing discovery tool accepts the first URL whose hostname matches a supported platform and whose `username` parses. A loose prefix match (the kind a Tavily snippet returns) was letting in candidates that did not belong to the résumé owner. We need a tighter filter that anchors the candidate to the source text.
3. **Lost PDF hyperlinks.** `pdf-parse@2`'s default `getText()` strips icons and link annotations. The LinkedIn/GitHub/X icons that appear next to a candidate's name on many modern résumés become plain text glyphs, severing the link target. The downstream LLM cannot reconstruct the icon-to-URL mapping from the de-iconified text.

All three fixes are localized to `apps/import-agent`. The web app, the API, the schemas package, and Supabase are unaffected.

## Goals / Non-Goals

**Goals:**

- Eliminate false-positive social profile discovery (different-person URLs).
- Restore the icon-to-URL mapping in PDF imports.
- Make all import-agent workflows green under `@mastra/core@1.38.0`.
- Keep the surface area of `applySocialProfileDiscovery` predictable for callers (single object input).
- Preserve the existing JSON-Resume-shape contract on the workflow outputs (schema-valid drafts, same `previewData` shape).

**Non-Goals:**

- Re-introducing `structuredOutput` via a different mechanism (e.g. `output` on a `createTool` call). The existing JSON-in-text parsing already produces valid JSON in our tests; we keep it.
- Filtering the website-import workflow by source text. The website import does not produce a structured source text — it loads a URL and asks the agent to extract a draft. Filtering is a no-op for that workflow.
- Adding a new capability or spec for the v1 contract; we just amend the existing `resume-import-agent` requirement.
- Changing the discovered-profile merge order or the platform list (LinkedIn, GitHub, X, Instagram, Facebook, Dribbble, Behance).
- Touching any `apps/api` / `apps/web` / `packages/*` file.

## Decisions

### Decision 1 — Drop `structuredOutput` instead of swapping to a supported v1 surface

The `Agent#generate` v1.38 public surface we use accepts `{ maxSteps?, ...model-runtime-options }` plus the prompt. There is no `structuredOutput` overload that maps cleanly to "ask the model to return JSON" in the configuration we have. The existing `parseJsonFromAgentText` / manual `indexOf('{') … lastIndexOf('}')` parse path produces a `Record<string, unknown>` from `response.text` and is exactly what the workflows already do when `structuredOutput` is omitted. We drop the option, keep the parse path, and add no new helper.

**Alternatives considered:**

- Switch the agent to a `createTool({ inputSchema, outputSchema })` flow under the v1 `execute(inputData, context)` signature. Rejected: the import agent does not use `createTool` today; introducing it would balloon the change into a separate refactor (which the `upgrade-mastra-v1-and-deps` change explicitly scoped out).
- Force the LLM to return JSON via prompt engineering and use `output` from the v1 trace packages. Rejected: the parse-from-text path is already deterministic, already covered by tests, and the prompt already instructs the model to return only JSON.

### Decision 2 — Source-text matcher uses a word-boundary aware regex, not substring `includes`

The naïve `sourceText.toLowerCase().includes(username.toLowerCase())` would let `yorty` match a snippet like `yorty.dev` (fine) _and_ a snippet like `yortyrh` (false positive — that is a different person). The implementation in `discover-social-profiles.tool.ts` builds a per-username regex `(^|[^a-z0-9_])USERNAME([._-]|$)` so the candidate username must appear as its own token (or be followed by `.`, `_`, or `-` to allow for `yorty.dev`-style concatenations in PDF text). The leading character is similarly anchored. This catches the production bug (`jane` matching inside `jane-doe` no longer matches) while still allowing the legitimate `yorty.dev` / `yorty_` cases.

The matcher is built once per call (one regex compile per `socialProfilePlatform.key`) and reuses the lower-cased source text. Username regex special characters are escaped with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` so usernames with `.` or `+` do not break the pattern.

**Alternatives considered:**

- Substring `includes` — too permissive; that is the bug.
- Word-boundary `\b` regex — almost correct, but `\b` treats `-` as a word boundary, so `jane` would still match inside `jane-doe`. Rejected.
- Edit-distance threshold (e.g. Levenshtein ≤ 1) — overkill, and would let in `jane` ↔ `jane1` which is not the same person. Rejected.

### Decision 3 — `sourceText` is opt-in; legacy callers see no behavior change

The new `sourceText?: string` field on `DiscoverSocialProfilesInput` is undefined by default. The `buildSourceMatcher` helper returns `null` when source text is empty or absent, and the per-platform loop only consults the matcher when it is non-null. This means:

- Existing unit tests that construct `{ draft, searchApiKey }` without a source text still see the original accept-any-URL behavior.
- The website-import workflow (no source text available) still accepts any URL.
- The PDF text import workflow now passes `sourceText: input.sourceText` and gets the filter.

This keeps the change strictly additive at the API level.

### Decision 4 — `applySocialProfileDiscovery` becomes a single object input

The previous positional signature `(draft, searchApiKey, onProgress?)` is awkward to extend (a new required parameter would have to be appended to keep call sites source-compatible, which would be ambiguous in TypeScript). Switching to `{ draft, searchApiKey, onProgress?, sourceText? }` matches the pattern already used by `discoverSocialProfilesTool` and the `WebsiteImportWorkflowInput` shape. Two call sites (`pdf-import.workflow.ts`, `website-import.workflow.ts`) are updated; both already pass named values, so the diff is mechanical.

**Alternatives considered:**

- Keep the positional signature and add a 4th arg. Rejected: would be ambiguous about `sourceText` vs `onProgress` and would require explicit `undefined` pass-throughs.
- Split into two functions. Rejected: not enough surface area to justify a split.

### Decision 5 — `runTextImportWorkflow` uses a private inner helper to thread the `errors` array

The current `runTextImportWorkflow` declares `const errors: string[] = []` inline and uses it across the repair loop. To pass `sourceText` to `applySocialProfileDiscovery` we only need to change one line, but we keep the inner helper (`runTextImportWorkflowInner(input, errors)`) to preserve the public signature `runTextImportWorkflow(input): Promise<TextImportWorkflowResult>`. The public entry point now reads `return runTextImportWorkflowInner(input, [])`. No external caller is affected.

### Decision 6 — No e2e test changes

This is a logic / extraction fix in `apps/import-agent`. The existing unit tests cover all three call sites. The e2e suite (`apps/api/test/e2e/`) is API-facing; the import-agent workflows are exercised end-to-end through the `POST /cv/import/pdf` route, but those scenarios do not depend on the discovery filter or on the PDF hyperlink output. We add no e2e test; the rule "do not edit unrelated E2E specs to force green builds" is honored.

## Risks / Trade-offs

- [Risk] The word-boundary regex may reject legitimate candidates whose username is concatenated with a letter in the source text (e.g. `yalorty` for a candidate whose actual handle is `yorty` — unlikely in practice but possible). → Mitigation: the regex anchors to non-word characters _or_ the start/end of the string on both sides. Real PDF layouts put icons next to whitespace or punctuation; a username glued to a letter is not a realistic layout. If this becomes a problem, the matcher is the single place to tune.
- [Risk] `parseHyperlinks: true` may increase the extracted text size for heavily annotated PDFs. → Mitigation: the LLM context window has plenty of headroom for normal résumés; the change is on a per-PDF basis and does not change the LLM model id. If we ever see truncation, we revisit at the PDF size-limit spec.
- [Risk] The website-import workflow silently skips the source-text filter (no source text). A malicious or wrong-person website could still cause a wrong profile to be discovered. → Mitigation: website import already has its own input-validation path (the URL must be HTTPS, must be a real public website, and the agent's draft is verified before any profile is merged). The source-text filter is a _strengthening_ of the PDF path, not the website path.
- [Risk] The `structuredOutput` removal is technically a behavior change (we now depend on the LLM to follow the "return only valid JSON" instruction). The same instruction was already required when `structuredOutput` was in use, but `structuredOutput` would have re-validated and coerced the model output. → Mitigation: the existing `parseJsonFromAgentText` throws `Error('LLM did not return JSON')` when the output is not JSON, the same way it did before the v1 upgrade. The repair loop catches the schema-validation failure, calls the repair agent, and the bounded retry still applies.

## Migration Plan

This is a code-only change to `apps/import-agent`. No migration steps are required. The change is rolled out by deploying the rebuilt `apps/import-agent` package. No DB migration, no env var, no Supabase config change.

**Rollback:** revert the commit; no data is migrated; no API surface is removed.

## Open Questions

- _None for this change._ The `createTool` v1 migration is intentionally deferred (per the `upgrade-mastra-v1-and-deps` change's "Out of scope" section) and is a candidate for a follow-up change.
