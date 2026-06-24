## 1. Wire `loading` into the breadcrumb context

- [x] 1.1 In `apps/web/src/components/cv/cv-editor-chrome.tsx`,
      change the `setBreadcrumb(...)` call inside the existing effect
      to pass `basics: loading ? null : (resume?.basics ?? null)` and
      add `loading` to the effect's dependency array so the context
      updates when the CV fetch resolves.

## 2. Render a `Skeleton` placeholder in the breadcrumb while loading

- [x] 2.1 In
      `apps/web/src/components/cv/cv-editor-breadcrumb.tsx`, import
      the shared `Skeleton` component from
      `@/components/ui/skeleton` and treat `basics === null` as the
      loading signal. When loading, render the `Skeleton` (with
      `h-4 w-36 max-w-[45vw] sm:w-56` width and `aria-hidden="true"`)
      in place of the title segment; otherwise render the existing
      `<CvTitleDisplay>` (keeping the muted `Untitled CV` styling when
      basics is `{}`).

## 3. Add a regression test

- [x] 3.1 Add a test in
      `apps/web/src/components/cv/cv-editor-breadcrumb.test.tsx`
      asserting that when `basics` is `null`, the breadcrumb nav
      contains the `[data-slot="skeleton"]` placeholder with
      `aria-hidden="true"` and does NOT render the literal
      `Untitled CV` text.

## 4. Verify

- [x] 4.1 Run
      `pnpm --filter @resubuild/web exec vitest run --no-coverage src/components/cv/cv-editor-breadcrumb.test.tsx`
      to confirm all 7 breadcrumb tests pass (6 existing + 1 new).
- [x] 4.2 Run
      `pnpm --filter @resubuild/web exec vitest run --no-coverage`
      to confirm the full web unit-test suite still passes (no
      regressions in `cv-editor-skeleton.test.tsx`,
      `dashboard-top-bar.test.tsx`, or any breadcrumb-adjacent tests).
- [x] 4.3 Run `pnpm --filter @resubuild/web typecheck` to confirm the
      modified files compile cleanly under strict TS.
- [x] 4.4 Run `npx biome check` on the three modified files to confirm
      they respect the project's lint rules.

## E2E test impact

None — UI-only change inside `apps/web/src/components/cv`. The change
touches the breadcrumb rendering during the chrome-mounted,
data-fetching window; it does not modify the `cv-editor-ui` API
contract, Nest API, Supabase RLS, auth, or media storage. The Playwright
E2E specs in `apps/api/test/e2e/*.e2e-spec.ts` exercise the REST
contracts and the seeded fixture's page transitions, none of which are
affected by swapping the muted `Untitled CV` text for a `Skeleton`
placeholder in the dashboard top-bar breadcrumb.

- **Must pass unchanged**: all existing
  `apps/api/test/e2e/*.e2e-spec.ts` describe blocks
  (`local-supabase.e2e-spec.ts`, etc.) — they cover auth, CV create /
  list / detail / patch / delete, media upload, JSON Resume export,
  preview HTML export, and import flows, none of which read from the
  breadcrumb's title text.
- **Update required**: none.
- **Add**: none.
