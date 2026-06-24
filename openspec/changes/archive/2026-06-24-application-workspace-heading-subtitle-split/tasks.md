## 1. Split the workspace header into a heading and a subtitle

- [x] 1.1 In
      `apps/web/src/components/applications/application-workspace.tsx`,
      replace the single `<h1>` that joined `jobTitle` and
      `jobCompany` with a `<div>` containing: - an `<h1>` rendering `data.jobCompany?.trim() || 'Application'`
      with `truncate text-2xl font-semibold tracking-tight` - an optional `<p class="text-muted-foreground truncate text-sm sm:text-base">`
      rendering `data.jobTitle?.trim()` only when the trimmed value
      is non-empty.

## 2. Update the existing test and add fallback coverage

- [x] 2.1 In
      `apps/web/src/components/applications/application-workspace.test.tsx`,
      update the existing
      "shows the company as the heading and the position as a subtitle
      on the same row as the Update button" assertion to look up the
      position via `within(heading.parentElement).getByText(...)` and
      assert it is a `<p>` with `text-muted-foreground`.
- [x] 2.2 Add a "falls back to 'Application' as the heading when the
      company is missing" test that mocks
      `{ jobTitle: 'Senior Engineer', jobCompany: null }` and
      asserts the `<h1>` reads "Application" with "Senior Engineer"
      as the muted subtitle.
- [x] 2.3 Add an "omits the subtitle when the position is missing"
      test that mocks `{ jobTitle: null, jobCompany: 'Acme' }` and
      asserts the muted subtitle `<p>` is not rendered.

## 3. Verify

- [x] 3.1 Run
      `pnpm --filter @resubuild/web exec vitest run --no-coverage src/components/applications/application-workspace.test.tsx`
      to confirm the updated and new tests pass.
- [x] 3.2 Run
      `pnpm --filter @resubuild/web exec vitest run --no-coverage`
      to confirm the full web unit-test suite still passes (no
      regressions in `application-list.test.tsx`,
      `application-row-card.test.tsx`, or any other workspace-adjacent
      tests).
- [x] 3.3 Run `pnpm --filter @resubuild/web typecheck` to confirm the
      modified file compiles cleanly under strict TS.
- [x] 3.4 Run `npx biome check` on the two modified files to confirm
      they respect the project's lint rules.

## E2E test impact

None — UI-only change inside `apps/web/src/components/applications`.
The change swaps the in-page header layout (single concatenated `<h1>`
→ `<h1>` + optional subtitle `<p>`) but does not modify the
`application-workspace-tabs` API contract, the Nest API, the
`JobApplicationSummary` payload shape, Supabase RLS, auth, or media
storage. The Playwright E2E specs in `apps/api/test/e2e/*.e2e-spec.ts`
exercise the REST contracts and the seed/import/export flows, none of
which are affected by the header visual hierarchy.

- **Must pass unchanged**: all existing
  `apps/api/test/e2e/*.e2e-spec.ts` describe blocks
  (`local-supabase.e2e-spec.ts`, etc.) — they cover auth, CV create /
  list / detail / patch / delete, media upload, JSON Resume export,
  preview HTML export, and import flows, none of which read the
  workspace page header.
- **Update required**: none.
- **Add**: none.
