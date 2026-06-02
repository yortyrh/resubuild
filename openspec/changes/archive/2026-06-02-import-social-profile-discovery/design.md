## Context

Agent import (`apps/import-agent`) converts extracted résumé text into JSON Resume via LLM draft + verify/repair loop. An optional `webLookupTool` already calls Tavily Search for company names during verify, but results are discarded and never merged into the draft. Social profiles live in `basics.profiles[]` with `{ network, username, url }` and are edited post-import on the Social profiles tab.

Users may configure Tavily via `web_scrape_config` for website import page extraction; the same key is passed as `searchApiKey` to import workflows. Import preview (`import-preview-ui`) lets users Preview, Edit, and Save before `POST /cv`.

## Goals / Non-Goals

**Goals:**

- After a schema-valid import draft, search the public web for the candidate's profiles on major networks and merge high-confidence matches into `basics.profiles`.
- Reuse Tavily and the user's existing web scrape API key; skip gracefully when unset.
- Never remove or overwrite profiles already present in the draft.
- Keep discovery bounded (max queries, timeout) so import jobs stay predictable.
- Expose discovery outcome to the web client so import toasts can mention auto-added profiles.

**Non-Goals:**

- Discovering profiles for JSON file import (no agent pipeline).
- Verifying profile ownership beyond URL hostname and path heuristics (no OAuth or login).
- Persisting raw Tavily responses or search audit logs.
- Replacing manual profile editing; discovery is a draft enrichment step only.
- Using Firecrawl for search (Tavily Search only; Firecrawl remains for page extraction).

## Decisions

### 1. Dedicated `discoverSocialProfilesTool` (extend, don't overload `webLookupTool`)

**Choice:** Add `discover-social-profiles.tool.ts` with platform-specific search queries and URL validation. Keep `webLookupTool` for company enrichment (future use) unchanged.

**Rationale:** Social discovery needs multi-query orchestration, hostname allowlists, and merge logic—different contract from single-result company lookup.

**Alternative considered:** Prompt the LLM to invent profile URLs — rejected because hallucinated URLs are worse than missing profiles.

### 2. Run discovery once after schema validation succeeds, before finalize

**Choice:** In `runTextImportWorkflow`, after validation passes and before `onProgress('finalizing')`, call discovery when `searchApiKey` is set and `basics.name` is non-empty.

**Flow:**

```
draft → normalize dates → validate → [discovery merge] → finalize → previewData
```

**Rationale:** Avoids wasting Tavily quota on drafts that will fail repair; ensures merged profiles appear in `previewData`.

### 3. Platform catalog with hostname allowlists

**Choice:** Target a fixed catalog aligned with `resume-template-header-icons` supported networks:

| Network   | Search query template         | URL host patterns                |
| --------- | ----------------------------- | -------------------------------- |
| LinkedIn  | `{name} {company} LinkedIn`   | `linkedin.com/in/`               |
| GitHub    | `{name} GitHub`               | `github.com/` (exclude `/orgs/`) |
| X         | `{name} Twitter OR X profile` | `x.com/`, `twitter.com/`         |
| Instagram | `{name} Instagram`            | `instagram.com/`                 |
| Facebook  | `{name} Facebook`             | `facebook.com/`                  |
| Dribbble  | `{name} Dribbble`             | `dribbble.com/`                  |
| Behance   | `{name} Behance`              | `behance.net/`                   |

Skip a platform when the draft already has a profile whose `network` normalizes to that platform (case-insensitive).

**Rationale:** Constrains false positives; matches template icon recognition.

### 4. Bounded Tavily usage

**Choice:** At most **5** platform searches per import job; each query `max_results: 3`; 8s timeout per request; stop on first valid URL per platform.

**Rationale:** Cost and latency control; typical résumé needs 2–4 networks.

### 5. Merge rules

**Choice:** Pure function `mergeDiscoveredProfiles(existing, discovered)` in `@resumind/types` or import-agent:

- Append only profiles with valid HTTPS URLs passing hostname check.
- Derive `username` from URL path segment when missing.
- Normalize `network` to canonical label (e.g. `LinkedIn`, `GitHub`, `X`).
- Deduplicate by normalized URL (strip trailing slash, lowercase host).

Never mutate other `basics` fields.

### 6. Job metadata for UI toast

**Choice:** Extend import job terminal payload (internal to API job store, returned on `GET /cv/import/:jobId`) with optional `discoveredProfilesCount: number` when discovery added at least one profile.

**Rationale:** Client can toast without diffing preview JSON. Field is additive; clients that ignore it behave as today.

**Alternative considered:** Client-side diff of preview — rejected as fragile and redundant.

### 7. Unit tests with injected search fn

**Choice:** Same pattern as `webLookupTool`: inject `WebSearchFn` mock returning fixture URLs; test merge, skip-when-no-key, skip-when-already-present, invalid URL rejection.

## Risks / Trade-offs

- **[Wrong person matched]** → Mitigate with `{name} {company}` disambiguation and strict hostname/path rules; user reviews in Preview/Edit before Save.
- **[Tavily quota / latency]** → Bounded queries, skip on error without failing job, log warning in job progress.
- **[Privacy]** → Search uses extracted résumé identity only; document in settings that Tavily receives name/employer strings.
- **[Stale webLookup company calls]** → Existing no-op company lookups remain; optional follow-up to remove or wire separately.

## Migration Plan

No database migration. Ship behind existing Tavily configuration. Users without Tavily see unchanged behavior. Rollback = remove discovery step from workflows; preview JSON reverts to LLM-only profiles.

## Open Questions

- Whether to add Reddit/Discord to the v1 catalog (supported in templates but lower signal on résumé import) — **defer to v2** unless trivial to include.
- Whether discovery should run when draft has _some_ but not all platforms — **yes**, fill gaps only.
