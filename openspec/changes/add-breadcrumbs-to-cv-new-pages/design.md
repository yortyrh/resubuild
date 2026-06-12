## Context

Resumind's dashboard has two CV-creation entry points under `/dashboard/cv/new/*`:

- `/dashboard/cv/new/import/file` — multipart file import (JSON, PDF, Markdown, Word, image).
- `/dashboard/cv/new/import/url` — URL import (JSON Resume endpoint or HTML page → agent job).
- `/dashboard/cv/new/create` — manual basics-only create.

`/dashboard/cv/new` itself is a server redirect to `/dashboard/cv/new/import/file`, and the deprecated import sub-routes (`/import/json`, `/import/website`, `/import/markdown`, `/import/pdf`) all redirect into `/import/file` as well.

All three active routes are wrapped by a shared `NewCvLayoutChrome` (`apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`) that already renders the page title and subtitle. Currently the chrome renders the title, subtitle, and `Cancel` button — but no breadcrumb. Users arrive from `/dashboard` (the CV list), from cross-links inside the import forms (`Import from URL` / `Import from file`), or from deprecated redirect chains, and the only way back to the CV list is the chrome's `Cancel` button. There is no visible breadcrumb context for "where am I in the app" above the title.

The CV editor already establishes the pattern: `CvEditorBreadcrumb` at `apps/web/src/components/cv/cv-editor-breadcrumb.tsx` uses `My CVs` → `/dashboard` as the base. The application workspace establishes a parallel pattern: `ApplicationWorkspaceBreadcrumb` at `apps/web/src/components/applications/application-workspace-breadcrumb.tsx` uses `Applications` → `/dashboard/applications` as the base. The new-CV flow is conceptually closer to the editor flow (its parent surface is the CV list at `/dashboard`), so the base segment MUST be `/dashboard` per the user's requirement.

## Goals / Non-Goals

**Goals:**

- Render a breadcrumb at the top of each of the three new-CV pages — ABOVE the page title and subtitle — that links back to `/dashboard` and labels the current page.
- Render the breadcrumb from the shared `NewCvLayoutChrome` so it sits above the title and is the single source of truth for new-CV flow chrome.
- Reuse the existing `Breadcrumb` UI primitives from `apps/web/src/components/ui/breadcrumb.tsx` — no new primitive.
- Match the visual style of the existing breadcrumbs (same spacing, same `BreadcrumbList` / `BreadcrumbLink` / `BreadcrumbPage` / `BreadcrumbSeparator` composition).

**Non-Goals:**

- Reorganising the new-CV flow into a multi-step wizard with progress states.
- Adding breadcrumbs to the deprecated redirect-only pages (`/dashboard/cv/new`, `/dashboard/cv/new/import/json`, `/dashboard/cv/new/import/website`, `/dashboard/cv/new/import/markdown`, `/dashboard/cv/new/import/pdf`).
- Changing the `Cancel` button destinations — they remain the existing "back to dashboard" route.
- Touching API, schema, persistence, or any other route in the app.

## Decisions

### 1. Breadcrumb lives in the chrome, not in the individual page files

Each of the three new-CV pages is already wrapped by `NewCvLayoutChrome` (via `apps/web/src/app/dashboard/cv/new/layout.tsx`), which renders the title, subtitle, and `Cancel` button. The breadcrumb is part of the same chrome, so it MUST be rendered by the chrome — not by each page file — so the visual order on screen is `Breadcrumb → Title → Subtitle → Cancel → Form`, matching the convention on `/dashboard/applications/new`.

Concretely:

- The chrome imports `NewCvFlowBreadcrumb` and renders it as the first child of its outer `<div className="space-y-6">`, before the existing title/cancel header.
- The breadcrumb label is sourced from the existing `getNewCvPageCopy(pathname)` map (a new `breadcrumbLabel` field), so title, subtitle, and breadcrumb label stay in sync from a single data source.
- The three page files (`import/file/page.tsx`, `import/url/page.tsx`, `create/page.tsx`) are reduced to their existing form rendering — no wrapper, no breadcrumb import.

Alternatives considered:

- Render the breadcrumb in each page file and the chrome separately — rejected; would force three different page files to know the chrome's breadcrumb label, drift risk.
- Hoist the title/subtitle/cancel out of the chrome and into each page — rejected; the chrome exists exactly to avoid duplicating that header on three pages.

### 2. New `NewCvFlowBreadcrumb` component, not inline JSX

A dedicated component (mirroring `ApplicationWorkspaceBreadcrumb` and `CvEditorBreadcrumb`) is preferred over inline breadcrumb JSX in the chrome because:

- It's directly unit-testable in isolation.
- It composes the same `Breadcrumb` primitives the editor and workspace flows already use, so the visual contract is the existing one.
- The chrome stays short and declarative.

Alternatives considered:

- Reuse `ApplicationWorkspaceBreadcrumb` with a `baseHref`/`baseLabel` prop — rejected; the workspace breadcrumb's semantics ("Applications" root, optional job label from data) are different enough that overloading the API would create awkward optional props.
- Reuse `CvEditorBreadcrumb` — rejected; that component requires a `cvId` and a derived CV title, neither of which exists on the new-CV flow.

### 3. Component shape

```ts
interface NewCvFlowBreadcrumbProps {
  pageLabel: string;
  className?: string;
}
```

The component renders a single non-link segment for the current page. The new-CV flow has no intermediate "context" entity (no job, no CV yet) — there are only two segments: `My CVs` (link) and the current step (static text).

### 4. Labels per route

Sourced from the new `breadcrumbLabel` field of `getNewCvPageCopy(pathname)`:

- `/dashboard/cv/new/import/file` → `"Import from file"`
- `/dashboard/cv/new/import/url` → `"Import from URL"`
- `/dashboard/cv/new/create` → `"Create CV"`
- Fallback (unknown path) → `"New CV"`

These are short, action-oriented labels — distinct from the longer descriptive `title` field in the same map (e.g. `Create a CV manually`), matching the convention on `/dashboard/applications/new` where the breadcrumb label (`Preparing application…`) is shorter than the page title (`Prepare application`).

## Risks / Trade-offs

- [Two-segment trail is short] → Acceptable. The new-CV flow is shallow (CV list → create/import step). A single current-page segment communicates that clearly, and the same shape is used in `/dashboard/applications/new`.
- [Deprecated redirect routes bypass the breadcrumb] → Acceptable. Those routes immediately `redirect()` to one of the active routes, so the user lands on a breadcrumb-equipped page within one request.
- [Breadcrumb label lives in the page copy map, not in the breadcrumb component] → The breadcrumb component stays generic; the chrome maps the active pathname to a label via `getNewCvPageCopy`. Adding a fourth new-CV route (e.g. a future import-from-LLM page) requires one new entry in the map, not a new breadcrumb prop or new chrome branch.

## Migration Plan

No data migration, no API change. Deploy is just the Next.js web build. Rollback = revert the five files (one new component, one new test, one new test for the copy map, the updated chrome, the updated copy map, and the simplified three page files).

## Open Questions

None.
