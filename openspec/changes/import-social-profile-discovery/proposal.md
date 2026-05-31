## Why

Imported résumés often omit or bury social profile links (LinkedIn, GitHub, portfolio sites) even when the candidate's public profiles are easy to find online. Authors must manually open the Social profiles tab and add each network after import. Automating discovery during the agent import pipeline reduces post-import cleanup and produces richer `basics.profiles` in the preview the user already reviews before Save.

## What Changes

- Add a **social profile discovery** step to agent import workflows (PDF, Markdown, free text, and HTML URL) that runs after a schema-valid draft exists.
- Build search queries from identity signals in the draft (`basics.name`, `basics.email`, current employer from `work[0]`, optional location).
- Use the user's configured Tavily web scrape API key (same as existing optional web lookup) to search for known platforms: LinkedIn, GitHub, X/Twitter, Instagram, Facebook, Dribbble, Behance, and personal portfolio sites.
- Merge discovered profiles into `basics.profiles` as JSON Resume `{ network, username, url }` entries without overwriting profiles already present in the draft.
- Validate candidate URLs (HTTPS, hostname matches expected platform) before merge; skip low-confidence or duplicate results.
- Surface a success toast on import forms when profiles were auto-added so the user knows to review them in Preview/Edit before Save.
- Skip discovery entirely when Tavily is not configured or when the draft already has profiles for all targeted networks.

## Capabilities

### New Capabilities

- `import-social-profile-discovery`: Search the public web during import to find and merge social network profiles into `basics.profiles` with platform validation and deduplication.

### Modified Capabilities

- `resume-import-agent`: Register a social profile discovery tool; invoke it from PDF, text, and website import workflows after validation passes; reuse Tavily `searchApiKey` from web scrape settings.
- `cv-pdf-import`: Agent import `previewData` MAY include auto-discovered `basics.profiles`; discovery SHALL NOT block import when search fails or is skipped.
- `import-preview-ui`: Agent import success toasts SHALL mention when social profiles were auto-discovered so the user can verify before Save.

## Impact

- **Import agent** (`apps/import-agent`): New discovery tool, platform URL parsers, workflow integration in `pdf-import`, `website-import`, and shared text path.
- **API** (`apps/api`): No new REST endpoints; existing import jobs pass Tavily key already used for web lookup.
- **Web** (`apps/web`): Optional toast copy when job metadata indicates discovered profiles (may extend job poll response with `discoveredProfilesCount` or infer from preview).
- **Dependencies**: Tavily Search API (optional, user-provided key via `web-scrape-config`).
- **Privacy**: Search uses only data already extracted from the user's uploaded résumé; no persistence of raw search results beyond merged profile URLs in preview JSON.
