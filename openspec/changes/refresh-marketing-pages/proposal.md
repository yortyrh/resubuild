> This change retroactively documents work already implemented in the working tree.

## Why

The first landing page shipped a minimal marketing surface with dashboard-style chrome, video-based feature demos, and CTAs pointing at `app.resubuild.dev`. Section headings wrapped awkwardly, the How It Works steps rendered inline (number beside icon), and `/features` used a separate header and video grid that did not match the home page. Visitors need a cohesive Finley-inspired marketing experience with CSS product mocks, shared navigation, and a clear path through `/login`.

## What Changes

- Refresh the `/` landing page with Finley-style design tokens (`--landing-*` in `(marketing)/globals.css`), grid background, gradient accents, and shared `MarketingHeader` / `MarketingFooter` / `SectionHeader` components.
- Replace the hero video with a server-rendered `HeroVisual` CSS mock (PDF → structured CV) using existing `landing-animations.css` keyframes.
- Fix How It Works to the Finley step pattern: vertical step columns, shared connector track, gradient numbered circles, icon boxes below circles.
- Shorten section titles (Features: "Everything for a Polished CV"; How It Works: "PDF to Polished CV") and tighten hero vertical padding at `md`.
- Point all **Try the live demo** CTAs to `/login` instead of `https://app.resubuild.dev`.
- Move `/features` into the `(marketing)` route group; reuse `MarketingHeader` and marketing styles; replace video recordings with per-feature CSS illustrations (`FeatureIllustration`, `FeatureCard`).
- Update header nav hash links to absolute paths (`/#features`, `/#how-it-works`, `/#faq`) so they work from `/features`.
- Add colocated Vitest coverage for `(marketing)/features/page.test.tsx`; update `(marketing)/page.test.tsx` CTA assertions.
- Remove the legacy `apps/web/src/app/features/page.tsx` (video showcase hero and old chrome).

## Capabilities

### New Capabilities

_None — extends existing marketing capabilities._

### Modified Capabilities

- `landing-page`: Hero visual, header/footer chrome, Finley tokens, step layout, CTA targets, and section copy.
- `web-application`: `/features` route lives under `(marketing)/`, shares marketing chrome, uses illustration cards instead of videos.
- `visual-design-system`: Marketing-only `--landing-*` Finley palette and component utilities scoped to `(marketing)/globals.css`.

## Impact

- **Code**: `apps/web/src/app/(marketing)/page.tsx`, `globals.css`, `layout.tsx`, `page.test.tsx`, new `(marketing)/features/page.tsx` + test; new `components/landing/{header,hero-visual,section-header}.tsx`; updated landing section components; new `components/features/{feature-card,feature-illustration}.tsx`; deleted `apps/web/src/app/features/page.tsx`.
- **Routing**: `/features` URL unchanged; implementation path moves to `(marketing)/features/page.tsx`.
- **Dependencies**: No new npm packages; no API or auth contract changes.
- **E2E**: UI-only — existing `local-supabase.e2e-spec.ts` scenarios unchanged.
