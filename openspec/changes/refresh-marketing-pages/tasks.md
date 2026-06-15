## 1. Marketing design system

- [x] 1.1 Expand `apps/web/src/app/(marketing)/globals.css` with Finley `--landing-*` tokens, grid background, header/footer/button utilities, feature cards, step pattern, FAQ, and feature-illustration styles.
- [x] 1.2 Import marketing globals and animations via `(marketing)/layout.tsx`.

## 2. Shared landing components

- [x] 2.1 Add `MarketingHeader` with logo, `/#features` / `/#how-it-works` / `/#faq` nav, Log in, Get Started Free.
- [x] 2.2 Add `SectionHeader` for consistent section labels, titles, and subtitles.
- [x] 2.3 Add `HeroVisual` server component (PDF → CV CSS mock).
- [x] 2.4 Update `MarketingFooter`, `MarketingFeatures`, `MarketingHowItWorks`, `MarketingFaq`, `MarketingOpenStandard` to use landing tokens and `SectionHeader` where applicable.

## 3. Landing page (`/`)

- [x] 3.1 Refactor `(marketing)/page.tsx` with `MarketingHeader`, hero, sections, and `landing-grid-bg` shell.
- [x] 3.2 Set hero `md:py-10` padding; point **Try the live demo** to `/login`.
- [x] 3.3 Fix How It Works Finley step layout (flex-column cards, shared `.landing-steps-track`).
- [x] 3.4 Shorten Features and How It Works section titles.
- [x] 3.5 Update `(marketing)/page.test.tsx` — all demo CTAs assert `href="/login"`.

## 4. Features page (`/features`)

- [x] 4.1 Create `(marketing)/features/page.tsx` with marketing chrome and `SectionHeader`.
- [x] 4.2 Add `FeatureIllustration` (per-id CSS mocks) and `FeatureCard`.
- [x] 4.3 Remove legacy `apps/web/src/app/features/page.tsx` (video showcase).
- [x] 4.4 Add `(marketing)/features/page.test.tsx` (header, no video, `/login` CTA).
- [x] 4.5 Update home Features link copy to "See all features →".

## 5. Quality gates

- [x] 5.1 Run `npx vitest run 'src/app/(marketing)/page.test.tsx'` — 4 passed.
- [x] 5.2 Run `npx vitest run 'src/app/(marketing)/features/page.test.tsx'` — 2 passed.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all scenarios from the **Test catalog (current)** section of `openspec/specs/e2e-testing/spec.md`.

### Update required

- None — UI-only marketing refresh; no API, auth, or persistence contract changes.

### Add

- `apps/web/src/app/(marketing)/features/page.test.tsx` — Vitest for features route (marketing chrome, illustrations, `/login` CTA).
