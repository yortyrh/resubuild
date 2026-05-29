## Why

The new-CV flow crams five distinct actions (manual create, PDF, JSON, URL, Markdown) into a single tabbed page at `/dashboard/cv/new`, which makes deep-linking, sharing, and navigation awkward. Users also need to import résumés from common formats beyond PDF and JSON—Markdown files and personal websites such as [JSON Resume Registry profiles](https://registry.jsonresume.org/thomasdavis)—without hunting through tabs. Replacing the flat "New CV" button with a dropdown and giving each path its own URL makes the create/import experience discoverable and bookmarkable.

## What Changes

- Replace the dashboard **New CV** button with a **dropdown menu** (shadcn `DropdownMenu`) listing every create/import option; each item navigates to a dedicated route.
- Split the monolithic `/dashboard/cv/new` tab page into **independent App Router pages**, one per path:
  - Manual create
  - Import PDF
  - Import JSON
  - Import from website URL (JSON Resume endpoints and registry profiles)
  - Import Markdown
- Add **Markdown import** API endpoint using the existing LLM import agent pipeline (same per-user LLM config gate as PDF).
- Extend **URL import** to support personal CV websites, including JSON Resume Registry profile URLs (HTML pages that resolve to `.json` endpoints server-side).
- **BREAKING**: `/dashboard/cv/new` SHALL redirect to a default route (e.g. `/dashboard/cv/new/import/pdf`); the tabbed multi-mode page is removed.
- Shared page chrome (title, subtitle, cancel → dashboard) extracted into a layout or wrapper reused across all create/import routes.

## Capabilities

### New Capabilities

- `cv-markdown-import`: Server and client behavior for uploading a Markdown résumé file, running the import agent, and creating a CV.
- `cv-website-import`: Dedicated URL import page and server-side resolution for personal CV websites (HTTPS JSON endpoints and JSON Resume Registry profile URLs).

### Modified Capabilities

- `web-application`: New CV dropdown on dashboard; per-route create/import pages instead of tabs on `/dashboard/cv/new`; redirect from legacy `/dashboard/cv/new`.
- `cv-json-import`: JSON import moves to its own route; URL import removed from JSON tab (moved to `cv-website-import`).
- `cv-pdf-import`: PDF import moves to its own route; requirement text updated from "tab on `/dashboard/cv/new`" to dedicated page URL.
- `cv-rest-api`: New `POST /cv/import/markdown` async job endpoint; URL import resolver extended for registry profile URLs.

## Impact

- **apps/web**: Route tree under `dashboard/cv/new/`, `cv-list.tsx` dropdown, remove tabbed `new-cv-page-client.tsx`, new page components for Markdown/URL, shared layout.
- **apps/api**: `ImportController` + `ImportService` extended for Markdown upload; URL resolver for `registry.jsonresume.org` profile paths.
- **apps/import-agent**: Extended text import workflow for Markdown (reuse PDF verify/finalize pipeline).
- **Testing**: Colocated Vitest for new pages/forms; E2E additions for Markdown import endpoint and URL registry resolution.

## Deferred

- **Word (`.docx`) import** — out of scope for this change; to be proposed separately when test fixtures are available.
