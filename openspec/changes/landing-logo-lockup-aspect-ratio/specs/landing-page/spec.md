## ADDED Requirements

### Requirement: The landing page logos SHALL render at the source SVG's intrinsic aspect ratio

The `MarketingHeader` and `MarketingFooter` components render the Resubuild wordmark via `next/image` from `apps/web/src/components/landing/logo-vectorized.svg` (a 2172×724 SVG, approximately 3:1). The `.landing-logo-lockup` (header) and `.landing-logo-lockup-sm` (footer) classes SHALL size the wordmark by constraining `width` and SHALL NOT force a `height` value that produces an aspect ratio different from the source SVG.

Concretely:

- `.landing-logo-lockup` and `.landing-logo-lockup-sm` MUST use `height: auto` so the rendered wordmark keeps the SVG's intrinsic aspect ratio at every viewport width.
- The classes MUST keep `width: 7.5rem`, `max-width: 100%`, and `flex-shrink: 0` so the wordmark stays the intended size in the header/footer layout.
- No `min-width` media query SHALL be required to make the wordmark render correctly — the base rule alone is correct at every breakpoint.

#### Scenario: Header wordmark renders without vertical compression

- **WHEN** an anonymous visitor loads `/` at any viewport width between 360px and 1920px
- **THEN** the `landing-logo-lockup` element SHALL render the wordmark with the SVG's intrinsic aspect ratio
- **AND** the rendered logo's height SHALL be derived from the SVG's intrinsic ratio (not a fixed `3.125rem`)

#### Scenario: Footer wordmark renders without vertical compression

- **WHEN** an anonymous visitor loads `/` at any viewport width between 360px and 1920px
- **THEN** the `landing-logo-lockup-sm` element SHALL render the wordmark with the SVG's intrinsic aspect ratio
- **AND** the rendered logo's height SHALL be derived from the SVG's intrinsic ratio (not a fixed `3.125rem`)

#### Scenario: No breakpoint-specific override is required

- **WHEN** the page is rendered at a viewport width below 768px
- **THEN** the wordmark's aspect ratio SHALL match the viewport rendered at 768px or wider
- **AND** no `@media (min-width: 768px)` rule SHALL override `.landing-logo-lockup` or `.landing-logo-lockup-sm`
