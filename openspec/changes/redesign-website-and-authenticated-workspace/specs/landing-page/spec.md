## MODIFIED Requirements

### Requirement: The landing page SHALL follow the supplied purple/teal reference design while preserving existing behavior

The landing page MUST preserve existing SEO, metadata, FAQ, JSON-LD, sitemap, and robots behavior while refreshing the visual presentation around the Resubuild brand system.

The implementation MUST use the requester-provided reference design image as the principal visual direction:

```text
583f8df5-e2f5-4076-ada1-b649c459d557.png
```

The landing page MUST compose, in this order:

1. **Header** — refreshed Resubuild logo, navigation, Log in, and primary CTA.
2. **Hero** — headline centered on PDF import and a polished CV outcome, primary CTA, secondary CTA, and a product mockup.
3. **Trust / benefits row** — No watermarks, Structured JSON Resume, private account data, ATS-friendly exports.
4. **Features** — four feature cards: AI PDF Import, Clean Editor, Job Tailoring, One-Click Export.
5. **How it works** — Import CV → Review & Edit → Tailor & Export.
6. **Workspace preview** — authenticated dashboard/application preview showing existing My CVs and Applications concepts only.
7. **Open standard / privacy / ATS callout** — retain JSON Resume and clean export positioning.
8. **FAQ** — existing SEO FAQ behavior and minimum item count remain in force.
9. **Final CTA** — clear conversion panel using the purple/teal brand gradient.
10. **Footer** — refreshed logo, links, and optional newsletter/signup affordance if already supported.

The visual system MUST use `#6d49f4` as the primary CTA/highlight color and `#00978a` as the secondary/progress/trust accent. Additional dominant accent colors SHOULD NOT be introduced.

The landing page MUST NOT advertise unsupported advanced features such as evidence panels, compare mode, generation summaries, match-analysis reports, or AI recommendation queues.

#### Scenario: Homepage uses refreshed brand identity

- **WHEN** an anonymous visitor loads `/`
- **THEN** the page SHALL render the refreshed Resubuild logo in the header and footer
- **AND** primary CTAs SHALL use the `#6d49f4` brand family
- **AND** trust/progress accents SHALL use the `#00978a` brand family

#### Scenario: Homepage communicates the existing product workflow

- **WHEN** the landing page renders
- **THEN** the page SHALL show sections that communicate import, structured editing, job tailoring, cover-letter/application workflow, and export
- **AND** SHALL include a product mockup or dashboard preview representing existing CV/application management concepts

#### Scenario: Landing SEO behavior remains intact

- **WHEN** the landing page is rendered after the redesign
- **THEN** existing FAQ, metadata, JSON-LD, sitemap, and robots expectations SHALL continue to pass