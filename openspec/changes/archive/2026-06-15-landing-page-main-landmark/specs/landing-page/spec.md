# landing-page — Delta Spec

## ADDED Requirements

### Requirement: The landing page SHALL expose a single `<main>` landmark containing the page's primary content

The landing page MUST wrap the hero section, `MarketingFeatures`, `MarketingHowItWorks`, `MarketingOpenStandard`, and `MarketingFaq` in a single `<main id="main-content">` element. The sticky `MarketingHeader` and `MarketingFooter` MUST remain siblings of that `<main>` (not inside it) so the landmark contains only the page's primary body content — matching the convention used by the existing `/features` page.

The landmark MUST carry a stable `id="main-content"` so a future "Skip to content" affordance can target it via fragment navigation.

The rest of the page composition (header order, section order, footer order, copy, classes) is unchanged.

#### Scenario: Lighthouse `landmark-one-main` audit passes

- **WHEN** Lighthouse runs an accessibility audit against `https://app.resubuild.dev/`
- **THEN** the `landmark-one-main` audit SHALL pass
- **AND** the rendered DOM SHALL contain exactly one `<main>` element
- **AND** that `<main>` element SHALL have `id="main-content"`

#### Scenario: Primary sections stay inside the landmark

- **WHEN** the landing page is rendered for an anonymous visitor
- **THEN** the rendered DOM SHALL place the hero, Features, How It Works, Open Standard, and FAQ sections as descendants of the `<main>` landmark
- **AND** SHALL keep `MarketingHeader` and `MarketingFooter` as siblings of `<main>` (not nested inside it)
