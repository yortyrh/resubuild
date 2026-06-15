## MODIFIED Requirements

### Requirement: The landing page SHALL include the required marketing sections in a defined order

The landing page MUST compose, in this exact order:

1. **Header** — sticky `MarketingHeader` (logo, nav anchors, Log in, Get Started Free).
2. **Hero** — display headline, product line, primary CTA (`Try the live demo` → `/login`), secondary CTA (`See how it works` → `#how-it-works`), `HeroVisual` mock.
3. **Features** — four feature cards with Finley-style `landing-feature-card` chrome and link to `/features`.
4. **How it works** — three Finley-pattern steps (numbered gradient circles on a shared connector track, icon box below circle, title, description) for Import PDF → Edit → Export PDF, plus bottom CTA to `/login`.
5. **Open standard** — JSON Resume callout linking to `jsonresume.org`.
6. **FAQ** — trend-aligned resume Q&A items plus product FAQ entries rendered as `<details>`/`<summary>` elements, sourced from `marketingFaqItems` in `apps/web/src/lib/seo-faq.ts`. The section MUST include at least nine Google Trends–driven questions (e.g. resume summary, resume skills, best resume templates, AI resume) followed by product-specific entries (privacy, export format, account, import, pricing).
7. **Footer** — `MarketingFooter` with wordmark, Live demo / GitHub / Sign in links, copyright.

Section titles MUST use concise copy (e.g. Features: "Everything for a Polished CV"; How It Works: "PDF to Polished CV") via `SectionHeader`. The FAQ section subtitle MUST mention resume writing tips and templates.

The page MUST contain exactly one `<h1>` (the hero headline) and a hierarchical `<h2>`/`<h3>` outline below it.

#### Scenario: All required sections render in order

- **WHEN** the landing page loads
- **THEN** the rendered DOM SHALL contain a single `<h1>` element
- **AND** SHALL contain section landmarks for Header, Hero, Features, How it works, Open standard, FAQ, and Footer in that order
- **AND** SHALL contain at least fourteen `<details>` elements under the FAQ section

#### Scenario: FAQ includes trend-driven resume summary question

- **WHEN** the FAQ section renders
- **THEN** it SHALL include a `<summary>` element with text `What is a resume summary?`

#### Scenario: How it works steps stack vertically

- **WHEN** the How it works section renders at `md` breakpoint or wider
- **THEN** each step card SHALL stack number, icon, title, and description vertically (not on one row)
- **AND** a horizontal connector track SHALL appear behind the numbered circles
