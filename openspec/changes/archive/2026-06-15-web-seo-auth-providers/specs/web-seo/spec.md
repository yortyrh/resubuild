## ADDED Requirements

### Requirement: The web app SHALL expose centralized public-site SEO configuration

The frontend MUST define shared SEO defaults in `apps/web/src/lib/site.ts` including site name, title, description, keywords, canonical base URL (`NEXT_PUBLIC_SITE_URL` with production fallback), Open Graph image path, locale, and an `absoluteUrl()` helper. Keywords MUST be sourced from `apps/web/src/lib/seo-faq.ts` and MUST include Google Trends target terms: `best resume`, `resume skills`, `best resume templates`, `resume templates`, `ai resume`, and `what is a resume summary`. Keywords MUST NOT include deprioritized variants such as `resume template` (singular), `resume ai`, or `free ats resume checker`.

#### Scenario: Site config builds absolute URLs

- **WHEN** `absoluteUrl('/features')` is called
- **THEN** the result SHALL be `${siteConfig.url}/features`

#### Scenario: Keywords include trend targets

- **WHEN** a developer reads `siteConfig.keywords`
- **THEN** it SHALL contain `best resume` and `ai resume`
- **AND** SHALL NOT contain `resume ai`

### Requirement: The root layout SHALL emit comprehensive metadata for public pages

`apps/web/src/app/layout.tsx` MUST export `metadata` with `metadataBase`, title template, description, keywords, Open Graph, Twitter card, robots directives for indexing, icons, and viewport/theme-color configuration derived from `siteConfig`.

#### Scenario: Root metadata includes social preview fields

- **WHEN** Next.js resolves metadata for a marketing page
- **THEN** Open Graph and Twitter entries SHALL include title, description, and image from `siteConfig`

### Requirement: The web app SHALL provide sitemap, robots, and web manifest routes

The App Router MUST expose:

- `sitemap.ts` listing `/` and `/features` with absolute URLs from `siteConfig`
- `robots.ts` allowing `/`, disallowing `/dashboard/` and `/api/`, and referencing the sitemap URL
- `manifest.ts` with app name, description, theme colors, and icon from `siteConfig`

#### Scenario: Sitemap lists marketing URLs

- **WHEN** `sitemap()` is invoked
- **THEN** the returned entries SHALL include the site root and `/features`

#### Scenario: Robots blocks dashboard from crawlers

- **WHEN** `robots()` is invoked
- **THEN** the rules SHALL disallow `/dashboard/` and `/api/`

### Requirement: Marketing routes SHALL emit JSON-LD structured data

A server component `JsonLd` in `apps/web/src/components/seo/` MUST render a `<script type="application/ld+json">` with `@graph` nodes for Organization, WebSite, WebPage, and SoftwareApplication. When rendered for `/`, the graph MUST also include a `FAQPage` node whose `mainEntity` questions match the visible FAQ on the landing page (sourced from `marketingFaqItems` in `seo-faq.ts`). Non-home marketing routes (e.g. `/features`) MUST NOT emit `FAQPage` schema.

#### Scenario: Home page includes FAQPage schema

- **WHEN** `JsonLd` renders with `path="/"`
- **THEN** the JSON-LD graph SHALL contain a `FAQPage` node
- **AND** the first question name SHALL be `What is a resume summary?`

#### Scenario: Features page omits FAQPage schema

- **WHEN** `JsonLd` renders with `path="/features"`
- **THEN** the JSON-LD graph SHALL NOT contain a `FAQPage` node

### Requirement: SEO configuration SHALL be unit-tested

Colocated Vitest tests MUST exist for:

- `apps/web/src/lib/site.test.ts` — URL helper and keyword presence
- `apps/web/src/lib/seo-faq.test.ts` — trend keywords and FAQ content
- `apps/web/src/components/seo/json-ld.test.tsx` — FAQPage presence/absence by path
- `apps/web/src/app/seo-routes.test.ts` — sitemap URLs and robots rules

#### Scenario: SEO route tests pass

- **WHEN** `pnpm test` runs the SEO route test file
- **THEN** sitemap and robots assertions SHALL pass without mocking Next.js runtime
