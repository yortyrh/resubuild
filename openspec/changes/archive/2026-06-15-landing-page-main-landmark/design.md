## Context

The marketing homepage at `apps/web/src/app/(marketing)/page.tsx` is a server component that composes `MarketingHeader`, a hero `<section>`, four marketing section components (`MarketingFeatures`, `MarketingHowItWorks`, `MarketingOpenStandard`, `MarketingFaq`), and `MarketingFooter`. Until now, every section lived directly under a single `<div className="landing-page landing-grid-bg min-h-screen">` wrapper with no `<main>` element. Lighthouse's axe-based `landmark-one-main` audit flagged the document for that, and screen-reader users had no programmatic way to skip past the sticky header to the page body.

The existing `/features` page already follows the convention of placing its primary content inside `<main>` (header and footer outside), so the fix aligns the homepage with that established pattern.

## Goals / Non-Goals

**Goals:**

- Expose exactly one `<main>` landmark on the homepage that wraps the hero and the four marketing sections.
- Give the landmark a stable `id="main-content"` so a future "Skip to content" affordance can target it via fragment navigation.
- Take the failing `landmark-one-main` Lighthouse audit to a passing state with minimal markup change.

**Non-Goals:**

- No visual, layout, copy, or class-name changes to any landing section.
- No new "Skip to content" link (a follow-up accessibility enhancement; not required to pass the audit).
- No changes to other marketing routes (`/features`, etc.) — they already use `<main>`.
- No refactor of the `HomeRedirect` client island, `HeroVisual`, or section components.

## Decisions

- **Wrap, don't restructure.** The landmark is added by introducing one `<main id="main-content">` element around the existing hero and section children, and a matching `</main>` close tag before `MarketingFooter`. The sticky `MarketingHeader` and `MarketingFooter` stay as direct children of the landing-page wrapper `<div>`, matching the `/features` page convention. This keeps the diff a single, well-scoped wrap with no risk to layout or class composition.
- **`id="main-content"` is added now, not later.** Even though a skip link is explicitly a non-goal, the conventional id is added preemptively so the future change can wire `href="#main-content"` against a stable, semantic target.
- **No new test.** The change is a one-element markup wrap that is fully covered by a Lighthouse audit on a deployed environment, which is the source of truth for `landmark-one-main`. The existing colocated `apps/web/src/app/(marketing)/page.test.tsx` keeps passing because it queries by accessible role/text and not by DOM landmark count.

## Risks / Trade-offs

- [Risk] Existing colocation tests or snapshot tests assert exact DOM tree shape and could break. → Mitigation: verified the colocated `page.test.tsx` queries the hero CTA and copy by text, not by landmark; the prettier-formatted result still passes lint and `vitest` (verify via `pnpm --filter @resubuild/web test`).
- [Risk] `id="main-content"` could collide with another component instance if the marketing layout is ever embedded inside a larger chrome (e.g. authenticated preview). → Mitigation: the marketing layout is only used on public marketing routes under `apps/web/src/app/(marketing)/`, so collision is not a current concern. The `id` is intentionally generic and matches the de-facto standard for skip-link targets.

## Migration Plan

This is a doc-only retroactive commit; the implementation is already in the working tree. Deployment is the standard Next.js build & deploy pipeline for `apps/web`. Rollback is a single revert of the implementation commit (commit 2 in the retroactive triple).

## Open Questions

None.
