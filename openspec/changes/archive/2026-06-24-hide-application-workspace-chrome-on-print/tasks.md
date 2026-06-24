## 1. Add `no-print` to the application workspace header wrapper

- [x] 1.1 Add the `no-print` class to the `<div className="px-2">`
      wrapper in
      `apps/web/src/components/applications/application-workspace.tsx`
      that hosts the job title `<h1>` and the Update button.

## 2. Add `no-print` to the tab strip header wrapper

- [x] 2.1 Add the `no-print` class to the flex `<div>` inside the
      `surface-soft` tabs card in
      `apps/web/src/components/applications/application-workspace.tsx`
      that hosts `TabsList` and the per-tab action buttons.

## 3. Verify

- [x] 3.1 Run `pnpm --filter web lint` and `pnpm --filter web typecheck`
      to confirm the class additions compile and the Prettier tailwind
      class sort is satisfied.

## E2E test impact

None — UI-only Tailwind class addition that activates only under the
`@media print` media query. The E2E specs in
`openspec/specs/e2e-testing/spec.md` run against a real browser via
Playwright-supertest; they do not exercise print media queries and
cover no print-related contracts. No E2E updates required.
