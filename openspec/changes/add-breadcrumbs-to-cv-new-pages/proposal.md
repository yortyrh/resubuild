## Why

The three new-CV flow pages — `/dashboard/cv/new/import/file`, `/dashboard/cv/new/import/url`, and `/dashboard/cv/new/create` — are all wrapped by the shared `NewCvLayoutChrome` (`apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`), which renders a page title, subtitle, and `Cancel` button. The chrome currently has no breadcrumb above the title. Users land here from `/dashboard/cv/new` (which redirects), from cross-links inside the import forms, or from deprecated redirect chains, and have no visible breadcrumb to show them where they are or how to get back to the dashboard CV list.

The Prepare-application flow already has the same pattern fixed (`ApplicationWorkspaceBreadcrumb` on `/dashboard/applications/new` linking to `/dashboard/applications`); the new-CV flow should match it, but the base page is `/dashboard` (the CV list), not `/dashboard/applications`.

## What Changes

- Add a new shared component `NewCvFlowBreadcrumb` (under `apps/web/src/components/cv/`) that renders the existing `Breadcrumb` primitives with a `My CVs` link to `/dashboard` and a configurable current-page label.
- Render `NewCvFlowBreadcrumb` from `NewCvLayoutChrome` as the first child of the chrome's outer container, **above the page title and subtitle** so the visual order is `Breadcrumb → Title → Subtitle → Cancel → Form`. The breadcrumb label is sourced from a new `breadcrumbLabel` field on `NewCvPageCopy` (returned by the existing `getNewCvPageCopy(pathname)` map):
  - `/dashboard/cv/new/import/file` → "Import from file"
  - `/dashboard/cv/new/import/url` → "Import from URL"
  - `/dashboard/cv/new/create` → "Create CV"
- The three new-CV pages become simpler: each just renders its form (no `space-y-4` wrapper, no breadcrumb import) because the chrome owns the breadcrumb.
- Add colocated unit tests for the new component and extend the existing `new-cv-page-copy.test.ts` to cover the new `breadcrumbLabel` field.
- No API, schema, or persistence changes. UI-only.

## Capabilities

### New Capabilities

- `cv-new-flow-breadcrumb`: Navigation chrome for the three create-CV routes (file import, URL import, manual create), anchored to the dashboard CV list at `/dashboard`, rendered by the shared `NewCvLayoutChrome` above the page title.

### Modified Capabilities

- None

## Impact

- Affected code:
  - New: `apps/web/src/components/cv/new-cv-flow-breadcrumb.tsx`
  - New: `apps/web/src/components/cv/new-cv-flow-breadcrumb.test.tsx`
  - Modified: `apps/web/src/app/dashboard/cv/new/new-cv-page-copy.ts` (add `breadcrumbLabel` field)
  - Modified: `apps/web/src/app/dashboard/cv/new/new-cv-page-copy.test.ts` (assert `breadcrumbLabel`)
  - Modified: `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx` (render breadcrumb above the title)
  - Modified: `apps/web/src/app/dashboard/cv/new/import/file/page.tsx` (drop wrapper, drop breadcrumb import)
  - Modified: `apps/web/src/app/dashboard/cv/new/import/url/page.tsx` (drop wrapper, drop breadcrumb import)
  - Modified: `apps/web/src/app/dashboard/cv/new/create/page.tsx` (drop wrapper, drop breadcrumb import)
- APIs, data model, dependencies: none.
- Tests: add Vitest coverage for the new component and extend the copy-map test. Existing import-form and create-form unit tests are unaffected.
- E2E: UI-only — no API contract change, so `local-supabase.e2e-spec.ts` scenarios remain unchanged.
