## Why

This change retroactively documents work already implemented in the working tree.

The Resubuild wordmark SVG was being rendered squished in the public landing page header and footer. The `.landing-logo-lockup` and `.landing-logo-lockup-sm` classes pinned `height: 3.125rem` alongside `width: 7.5rem`, but the source SVG's intrinsic aspect ratio is closer to 3:1 (2172×724). Because `width` already constrains the rendered size, the fixed `height` value forced a different aspect ratio than the source asset — producing a vertically compressed wordmark. A redundant `min-width: 768px` media query re-asserted the same dimensions at desktop sizes, so the bug was identical on every breakpoint.

## What Changes

- Set `height: auto` on `.landing-logo-lockup` and `.landing-logo-lockup-sm` in `apps/web/src/app/(marketing)/globals.css` so the SVG keeps its intrinsic aspect ratio while the class still controls `width` (and the `max-width: 100%` / `flex-shrink: 0` constraints from the existing layout).
- Remove the now-redundant `@media (min-width: 768px)` block that re-asserted the same `height`/`width` for both classes — the desktop and mobile values were identical, and the new `height: auto` rule is correct at every breakpoint.
- No JSX, no prop, and no structural component changes. The existing `<Image>` instances in `header.tsx` and `footer.tsx` keep using `landing-logo-lockup` and `landing-logo-lockup-sm` respectively.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-page`: add a requirement that the marketing header and footer logos render at the source SVG's intrinsic aspect ratio (no fixed-height distortion) across all viewports.

## Impact

- `apps/web/src/app/(marketing)/globals.css` — single file, two selectors + one removed media query.
- Visual rendering of the Resubuild wordmark on `/` in the public header and footer.
- No API, dependency, layout, or accessibility impact. No new third-party code. Existing `landing-page` unit tests and the `web-bundle-security` guard remain unaffected.
