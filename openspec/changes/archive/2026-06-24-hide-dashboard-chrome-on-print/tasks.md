## 1. Add `no-print` to the dashboard sidebar shell

- [x] 1.1 Add the `no-print` class to the root `<aside>` in
      `apps/web/src/components/dashboard/dashboard-sidebar-shell.tsx`.

## 2. Add `no-print` to the dashboard top bar

- [x] 2.1 Add the `no-print` class to the mobile-Sheet-open `<header>`
      branch in `apps/web/src/components/dashboard/dashboard-top-bar.tsx`.
- [x] 2.2 Add the `no-print` class to the default `<header>` branch in
      `apps/web/src/components/dashboard/dashboard-top-bar.tsx`.

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
