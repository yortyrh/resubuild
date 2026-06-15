## 1. Landing page markup

- [x] 1.1 Add `<main id="main-content">` wrapping the hero and the four marketing section components in `apps/web/src/app/(marketing)/page.tsx`, with `MarketingHeader` and `MarketingFooter` kept as siblings outside the landmark
- [x] 1.2 Confirm `apps/web/src/app/(marketing)/page.test.tsx` (and any other colocated tests touching the landing page) still pass — the change is a one-element wrap that does not affect any text, class, or role queried by the existing suite

## 2. Spec updates

- [x] 2.1 Add a new requirement + scenarios to `openspec/specs/landing-page/spec.md` documenting the single `<main id="main-content">` landmark, the Lighthouse `landmark-one-main` audit, and the section-inside/header-footer-outside composition

## 3. Verification

- [x] 3.1 `pnpm --filter @resubuild/web test` (or `pnpm test --filter @resubuild/web -- --run` per the workspace unit-test rule) passes
- [x] 3.2 `pnpm --filter @resubuild/web lint` and Prettier are clean
- [x] 3.3 Re-run Lighthouse against `https://app.resubuild.dev/` — `landmark-one-main` passes and accessibility score returns to 1.00

## E2E test impact

None — UI-only accessibility change to the public marketing homepage. The e2e suite exercises authenticated dashboard flows, not the public landing page. The colocated `apps/web/src/app/(marketing)/page.test.tsx` covers the anonymous-visitor hero rendering; the new landmark does not change any assertion it makes.
