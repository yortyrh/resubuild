## Why

Lighthouse accessibility audits on `app.resubuild.dev/` consistently flag `landmark-one-main`: the marketing homepage at `/` rendered its header, hero, features, how-it-works, open-standard, FAQ, and footer inside a plain `<div>` with no `<main>` landmark, dropping the accessibility score to 0.98. This change retroactively documents a small accessibility fix that adds a single `<main>` landmark around the page's primary content.

## What Changes

> This change retroactively documents work already implemented in the working tree.

- `apps/web/src/app/(marketing)/page.tsx` now wraps the hero, `MarketingFeatures`, `MarketingHowItWorks`, `MarketingOpenStandard`, and `MarketingFaq` sections in a single `<main id="main-content">` element. The sticky `MarketingHeader` and the `MarketingFooter` remain outside the landmark (the convention used by the existing `/features` page). All other markup, classes, and copy are unchanged.

## Capabilities

### New Capabilities

None — this is an a11y landmark addition to the existing landing page.

### Modified Capabilities

- `landing-page`: Add a requirement that the landing page exposes exactly one `<main>` landmark containing the hero and the marketing sections, with `id="main-content"` so a future skip link can target it.

## Impact

- `apps/web/src/app/(marketing)/page.tsx`: landing page component, one new wrapping `<main id="main-content">` element.
- `openspec/specs/landing-page/spec.md`: new requirement + scenario for the `<main>` landmark.
- Lighthouse accessibility audit `landmark-one-main` on `https://app.resubuild.dev/`.
