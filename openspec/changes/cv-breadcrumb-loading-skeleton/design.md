## Context

The CV editor chrome (`CvEditorProvider` + `CvEditorChrome`) is rendered
inside the `/dashboard/cv/[id]` segment's `CvLayoutShell`. The breadcrumb
in the dashboard top bar is rendered outside the chrome (in
`DashboardTopBar`) and reads its title from the
`DashboardBreadcrumbContext`. The chrome writes into that context via
`useDashboardBreadcrumb().setBreadcrumb(...)` inside a `useEffect` that
runs after mount, so:

1. On first render the breadcrumb context is the default
   (`{ variant: 'default' }`), and the top bar falls back to the generic
   route breadcrumb (e.g. `Dashboard`).
2. After the chrome effect fires, the context becomes
   `{ variant: 'cv', cvId, basics, activeSection, application }`.
3. `useCvEditor` keeps a local `resume` state that is initialised to
   `createEmptyResume()` (`{ basics: {}, work: [], … }`) and only swaps
   in the server's resume payload inside a `useEffect` keyed off `cv`.
   Until that swap, `resume.basics === {}` even though `isLoading`
   (from `useCv(cvId)`) is `true`.

The chrome previously wrote
`basics: resume?.basics ?? null` into the context — which collapses to
`{}` while `isLoading` because `resume` is never null. The breadcrumb
component derives its title with `deriveCvTitleFromBasics`, and that
helper returns the literal string `Untitled CV` for both the loading
case (`basics` is `{}`) and the loaded-but-empty case (real basics with
no name/label). The two states were indistinguishable at the
breadcrumb layer, so the loading window surfaced the misleading muted
"untitled" text alongside the page-level skeleton.

The existing `CvEditorBreadcrumbSkeleton` (in
`apps/web/src/components/cv/cv-editor-skeleton.tsx`) already renders
the right `Skeleton` widths and `aria-hidden` pattern for the
breadcrumb row, but it lives in the page-level loading.tsx and never
runs while the chrome is mounted — so it never covered this in-chrome
loading window.

## Goals / Non-Goals

**Goals:**

- Distinguish "loading" (`basics === null`) from "loaded but empty"
  (`basics === {}`) at the breadcrumb layer.
- Replace the muted `Untitled CV` text in the loading case with a
  `Skeleton` placeholder matching the existing breadcrumb skeleton
  width (`h-4 w-36 max-w-[45vw] sm:w-56`) and `aria-hidden` pattern.
- Keep `Untitled CV` muted text for the loaded-but-empty case so a CV
  whose basics are genuinely blank still surfaces that placeholder.

**Non-Goals:**

- Adding a separate `loading` boolean to the breadcrumb context type
  (the existing `basics === null` signal is sufficient and matches the
  preview client's `useState<CvTitleBasics | null>(null)` initial
  value).
- Reworking the chrome's loading orchestration (`isNavigating`,
  `mountedSection`) — those are out of scope and only the breadcrumb
  context wiring changes.
- Touching the page-level `loading.tsx`, the `CvEditorBreadcrumbSkeleton`
  helper, or `useCvEditor` itself.

## Decisions

### 1. Use `basics === null` as the loading signal (no new context flag)

The chrome's effect now writes
`basics: loading ? null : (resume?.basics ?? null)` and adds `loading`
to its dependency array. `null` is already a valid value in
`DashboardBreadcrumbState.basics: CvTitleBasics | null` and is already
the natural loading signal in the preview client
(`cv-preview-client.tsx` initialises its `useState<CvTitleBasics | null>(null)`
and only swaps to the real basics once `getCv(cvId)` resolves).

The alternative — adding a `loading?: boolean` field to the breadcrumb
context — would have duplicated the loading signal across the type, the
chrome effect, and the preview client's local state without any new
information. `basics === null` is the single source of truth and is
already what `deriveCvTitleFromBasics` collapses against
(`Untitled CV`) when the breadcrumb falls back.

### 2. Render the existing `Skeleton` (not a new component)

`apps/web/src/components/ui/skeleton.tsx` already provides a
`data-slot="skeleton"` `div` with the project-standard
`bg-muted animate-pulse rounded-md` styling. The
`CvEditorBreadcrumbSkeleton` helper in
`apps/web/src/components/cv/cv-editor-skeleton.tsx` uses the same
`Skeleton` component with widths matching the chrome's eventual title
(`h-4 w-36 max-w-[45vw] sm:w-56`). Re-using that width inside
`CvEditorBreadcrumb` keeps the loading-to-loaded transition visually
stable (no jump in row height when the title appears).

The `aria-hidden="true"` attribute is set on the skeleton so screen
readers do not announce "Untitled CV" placeholder text — the parent
`Breadcrumb` nav already exposes its `aria-label="Breadcrumb"`
landmark.

### 3. Update only `CvEditorBreadcrumb`, leave `CvApplicationEditorBreadcrumb` alone

`CvApplicationEditorBreadcrumb` does not consume `basics` — it renders
the application label, an optional `Edit CV` link, and the page label.
The `basics === null` signal does not affect it, so no change is
required there.

## Risks / Trade-offs

- **[Loading state is inferred from a single `null` value] → Mitigation**:
  The `basics === null` check is local to `CvEditorBreadcrumb` and only
  affects rendering; the actual data layer (`useCvEditor`) still tracks
  `isLoading` separately and continues to gate the section skeleton in
  `CvEditorChrome`. If a future caller passes `null` deliberately (the
  preview client's natural initial state), it will get the same
  skeleton, which is the intended behaviour — preview also wants a
  skeleton while `getCv(cvId)` is in flight.
- **[Effect dependency on `loading` could cause extra renders] →
  Mitigation**: `loading` flips once per CV fetch (from `true` to
  `false`). The effect already re-runs on `resume?.basics` changes, so
  this is at most one additional render per navigation, identical to
  the existing pattern.
- **[Tests must guard the loading-vs-empty distinction] → Mitigation**:
  The existing muted-text test still passes `basics={{}}` (not `null`),
  so the muted `Untitled CV` styling remains covered. A new test asserts
  the `Skeleton` placeholder is rendered inside the breadcrumb nav when
  `basics` is `null`.

## Migration Plan

Retroactive documentation of work already in the working tree. No data
migration, no API change, no flag flip. The skeleton appears in the
breadcrumb the next time the implementation lands; rollback = revert
the implementation commit (commit 2).
