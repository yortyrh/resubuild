# cv-new-flow-breadcrumb Specification

## Purpose

TBD - created by archiving change add-breadcrumbs-to-cv-new-pages. Update Purpose after archive.

## Requirements

### Requirement: New-CV flow pages SHALL render a breadcrumb above the page title, anchored to the dashboard CV list

The three active new-CV flow pages — `/dashboard/cv/new/import/file`, `/dashboard/cv/new/import/url`, and `/dashboard/cv/new/create` — SHALL each render a breadcrumb as the first visible element of the page, above the page title and subtitle. The breadcrumb SHALL contain exactly two segments:

1. A `My CVs` link pointing to `/dashboard` (the dashboard CV list).
2. A non-link current-page segment whose label describes the active route.

The breadcrumb SHALL be rendered by the shared `NewCvLayoutChrome` layout (`apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`) so a single component is the source of truth for the new-CV flow chrome. The breadcrumb label SHALL be derived from the existing `getNewCvPageCopy(pathname)` map (the new `breadcrumbLabel` field):

- `/dashboard/cv/new/import/file` → `Import from file`
- `/dashboard/cv/new/import/url` → `Import from URL`
- `/dashboard/cv/new/create` → `Create CV`

The breadcrumb component SHALL reuse the shared `Breadcrumb` UI primitives from `apps/web/src/components/ui/breadcrumb.tsx` so it matches the visual style of the CV editor and application workspace breadcrumbs.

#### Scenario: Import-from-file page shows My CVs and the current step

- **WHEN** a user opens `/dashboard/cv/new/import/file`
- **THEN** a breadcrumb is visible above the page title with `My CVs` linking to `/dashboard` followed by the current step `Import from file`

#### Scenario: Import-from-URL page shows My CVs and the current step

- **WHEN** a user opens `/dashboard/cv/new/import/url`
- **THEN** a breadcrumb is visible above the page title with `My CVs` linking to `/dashboard` followed by the current step `Import from URL`

#### Scenario: Create-CV page shows My CVs and the current step

- **WHEN** a user opens `/dashboard/cv/new/create`
- **THEN** a breadcrumb is visible above the page title with `My CVs` linking to `/dashboard` followed by the current step `Create CV`

#### Scenario: My CVs segment is a navigable link

- **WHEN** the breadcrumb is rendered
- **THEN** the `My CVs` segment SHALL be a focusable link with `href="/dashboard"` and SHALL NOT be marked as the current page

#### Scenario: Current step is not a link

- **WHEN** the breadcrumb is rendered
- **THEN** the current-page segment SHALL be a non-interactive text node with `aria-current="page"` and SHALL NOT be wrapped in an anchor

### Requirement: The breadcrumb component SHALL be a single shared component

A single component, `NewCvFlowBreadcrumb`, SHALL be the source of the breadcrumb for all three new-CV pages. The individual page files (`apps/web/src/app/dashboard/cv/new/import/file/page.tsx`, `.../import/url/page.tsx`, `.../create/page.tsx`) SHALL NOT inline their own breadcrumb JSX or import `NewCvFlowBreadcrumb`; the chrome renders it on their behalf using the `breadcrumbLabel` returned by `getNewCvPageCopy(pathname)`.

The component SHALL live under `apps/web/src/components/cv/` and SHALL be a client component (`'use client'`) consistent with the existing `CvEditorBreadcrumb` and `ApplicationWorkspaceBreadcrumb` components.

#### Scenario: The chrome renders the breadcrumb for all three pages

- **WHEN** a user opens any of the three new-CV pages
- **THEN** the breadcrumb SHALL be rendered by `NewCvLayoutChrome` and SHALL appear above the page title
- **AND** the individual page files SHALL NOT import `NewCvFlowBreadcrumb` or render breadcrumb JSX

#### Scenario: The breadcrumb label is sourced from getNewCvPageCopy

- **WHEN** `getNewCvPageCopy` is called with a known new-CV pathname
- **THEN** the returned object SHALL include a `breadcrumbLabel` string that the chrome passes to `NewCvFlowBreadcrumb`

### Requirement: The breadcrumb component SHALL be unit-tested

A colocated Vitest spec SHALL verify:

- A navigation landmark with `aria-label="Breadcrumb"` is rendered.
- A link with accessible name `My CVs` and `href="/dashboard"` is rendered.
- The provided `pageLabel` is rendered as the current-page text.
- The current-page segment carries `aria-current="page"`.

#### Scenario: Unit test renders breadcrumb with the given label

- **WHEN** `NewCvFlowBreadcrumb` is rendered with `pageLabel="Import from file"`
- **THEN** the navigation landmark is present
- **AND** a `My CVs` link to `/dashboard` is present
- **AND** the text `Import from file` is present in the current-page segment
- **AND** the current-page segment has `aria-current="page"`
