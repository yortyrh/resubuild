## Why

This change retroactively documents work already implemented in the
working tree. On `/dashboard/cv/[id]/*` the `CvEditorBreadcrumb` in the
dashboard top bar rendered the placeholder string `Untitled CV` while the
`CvEditorChrome` was still fetching resume data, because the chrome
seeded its `useCvEditor` state with `createEmptyResume()` (which yields
`basics: {}`) and pushed that into the breadcrumb context via
`basics: resume?.basics ?? null`. The page body already showed a skeleton
under the same loading window, so the breadcrumb's stale "Untitled CV"
text contradicted the existing `cv-editor-ui` requirement that the CV
editor show skeleton placeholders matching final layout while resume
JSON is unavailable.

## What Changes

- In `CvEditorChrome`, pass `basics: null` to the breadcrumb context
  while `useCvEditor().loading` is true, and re-pass the real
  `resume.basics` once the fetch resolves. Add `loading` to the effect
  dependency array so the context updates when loading flips off.
- In `CvEditorBreadcrumb`, treat `basics === null` as a loading signal
  and render a `Skeleton` placeholder (matching the width
  `h-4 w-36 max-w-[45vw] sm:w-56` and `aria-hidden` pattern used by the
  existing `CvEditorBreadcrumbSkeleton`) in place of the `Untitled CV`
  text. Keep the muted `Untitled CV` treatment for `basics === {}` so a
  CV whose basics are genuinely empty still surfaces the placeholder
  string once data has loaded.
- Add a unit test asserting the breadcrumb renders the `Skeleton`
  (`[data-slot="skeleton"]`, `aria-hidden`) inside the breadcrumb nav
  when `basics` is `null`, and continues to render the muted `Untitled
CV` text when `basics` is `{}` (the regression guard from the
  pre-existing `Untitled CV` muted-styling test).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cv-editor-ui`: tighten the "CV editor and dashboard SHALL show
  skeleton placeholders while loading" requirement so the breadcrumb
  nav segment in the dashboard top bar shows a `Skeleton` placeholder
  (matching the existing `CvEditorBreadcrumbSkeleton` width and
  `aria-hidden` pattern) while the CV fetch is in flight, instead of
  rendering the muted `Untitled CV` text. Loaded-but-empty basics
  (`basics.name` and `basics.label` both blank) continue to render the
  muted `Untitled CV` text so a CV without a name/label still signals
  that placeholder state.

## Impact

- `apps/web/src/components/cv/cv-editor-chrome.tsx` — pass
  `basics: loading ? null : (resume?.basics ?? null)` to the breadcrumb
  context; add `loading` to the effect deps.
- `apps/web/src/components/cv/cv-editor-breadcrumb.tsx` — render a
  `Skeleton` in place of the title when `basics === null`; keep the
  muted `Untitled CV` styling for `basics === {}`.
- `apps/web/src/components/cv/cv-editor-breadcrumb.test.tsx` — add a
  test asserting the breadcrumb nav contains the `Skeleton` placeholder
  while loading.

No API, schema, auth, design-token, or `globals.css` changes. **No
breaking** API change. **No breaking** UI change — loaded CVs render
exactly as before; only the chrome-mounted, data-fetching window
changes from `Untitled CV` text to a skeleton.
