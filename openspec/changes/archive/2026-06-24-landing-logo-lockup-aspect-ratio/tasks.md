## 1. CSS fix for the landing wordmark

- [x] 1.1 In `apps/web/src/app/(marketing)/globals.css`, set `height: auto` on `.landing-logo-lockup` (used by `apps/web/src/components/landing/header.tsx`).
- [x] 1.2 In `apps/web/src/app/(marketing)/globals.css`, set `height: auto` on `.landing-logo-lockup-sm` (used by `apps/web/src/components/landing/footer.tsx`).
- [x] 1.3 Remove the redundant `@media (min-width: 768px) { .landing-logo-lockup { ... } }` block (and any equivalent for `.landing-logo-lockup-sm`) so the base rule is correct at every breakpoint.

## 2. Verification

- [x] 2.1 Grep the web app to confirm no other component references `.landing-logo-lockup` or `.landing-logo-lockup-sm` (only `header.tsx` and `footer.tsx`).
- [x] 2.2 Confirm `next run build` (or `pnpm --filter web build`) still succeeds — the change is CSS-only and should not affect the production bundle.
- [x] 2.3 Visually confirm in a local dev server that the wordmark renders at the source SVG's aspect ratio on `/` in both the header and the footer at viewport widths below 768px and at 768px or wider.

## E2E test impact

None — UI-only visual fix to two CSS selectors. The existing `apps/web/src/app/(marketing)/page.test.tsx` route-level unit tests do not assert pixel dimensions, and the `web-bundle-security.test.ts` guard does not depend on logo styling. `openspec/specs/e2e-testing/spec.md` does not require any change.
