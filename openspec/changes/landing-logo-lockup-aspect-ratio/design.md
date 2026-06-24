## Context

The landing page header (`MarketingHeader`) and footer (`MarketingFooter`) both render the Resubuild wordmark via `next/image` consuming `apps/web/src/components/landing/logo-vectorized.svg`. The SVG source is 2172×724 — an aspect ratio of approximately 3:1.

Two CSS classes — `.landing-logo-lockup` (header) and `.landing-logo-lockup-sm` (footer) — were applied to those `<Image>` elements. Both pinned `height: 3.125rem` alongside `width: 7.5rem`, and a `min-width: 768px` media query re-asserted the same dimensions. Because the forced height did not match the SVG's intrinsic ratio, the wordmark rendered vertically compressed in the browser.

The constraint that mattered all along was `width` (and `max-width: 100%` / `flex-shrink: 0`). The fixed `height` provided no benefit and introduced the distortion.

## Goals / Non-Goals

**Goals:**

- Restore the SVG's intrinsic aspect ratio on both the header and footer logos.
- Keep the existing `width`, `max-width`, and `flex-shrink` behaviour untouched.
- Remove dead CSS (the redundant `min-width: 768px` media query) so the rule is correct at every breakpoint by default.

**Non-Goals:**

- Resizing the wordmark. The `width: 7.5rem` size stays.
- Adjusting the source SVG asset or its viewBox.
- Changing JSX, the `next/image` `sizes` attribute, or the surrounding header/footer layout.
- Touching the `<Image>` `priority` flag, the `width`/`height` props on the element, or any other token.

## Decisions

- **Use `height: auto` instead of removing the rule.** Keeping the class with `height: auto` (and the existing `width`, `max-width: 100%`, `flex-shrink: 0`) preserves the contract that the `landing-logo-lockup` / `landing-logo-lockup-sm` utilities own the wordmark's sizing. Downstream code that relies on the class names continues to work unchanged.
- **Drop the `min-width: 768px` media query.** The block re-declared `height: 3.125rem` and `width: 7.5rem` — the same values as the base rule. With `height: auto` the breakpoint override is no longer needed, and the base rule is correct at every viewport width.
- **Do not add `aspect-ratio` to the CSS.** `height: auto` plus an intrinsic-ratio SVG already produces the correct rendering via the user agent's image sizing rules. Adding `aspect-ratio` would be redundant and risks future drift if the source SVG is updated.

## Risks / Trade-offs

- [Visual diff on `/`] → The wordmark will be visibly taller (it now matches its 3:1 source aspect ratio). This is the intended fix; reviewed in the dev server before commit.
- [Class consumers outside the landing page] → Grep confirms only `header.tsx` and `footer.tsx` use these classes. No other component in the web app references them, so the change is local.

## Migration Plan

No data migration. No feature flag. The change is a CSS-only hotfix and ships the moment the diff is merged.
