# landing-page Specification

## Purpose

Define the public marketing surface for Resubuild: a single Next.js App Router page at `/` that demonstrates the product's signature capability (PDF → MIT-format CV) in the hero via a CSS product mock, walks the visitor through Import → Edit → Export, and routes anonymous visitors to `/login` through **Try the live demo** CTAs. The page MUST respect `prefers-reduced-motion`, MUST NOT introduce third-party animation libraries, and MUST NOT pull Supabase or service-role keys into the client bundle.

## Requirements

### Requirement: The web app SHALL render a public landing page at `/` for anonymous visitors

The App Router SHALL provide a public route at `/` that, for an anonymous visitor (no session in `sessionStorage`), renders a marketing landing page instead of redirecting to `/login`. The page MUST be reachable at exactly `/` and MUST NOT add a new URL segment (e.g. `/landing`). The page MUST be implemented inside a route group so the URL stays at `/`.

The landing page MUST be a server component by default. Client islands are limited to `HomeRedirect` (session redirect) and any future scroll-reveal toggles; the hero visual (`HeroVisual`) MUST be a server component.

The page MUST compose a sticky `MarketingHeader` with the Resubuild logo, anchor links to Features / How It Works / FAQ, a **Log in** link to `/login`, and a **Get Started Free** primary button to `/register`. Header anchor links MUST use root-absolute paths (`/#features`, `/#how-it-works`, `/#faq`) so they resolve from any marketing route.

#### Scenario: Anonymous visitor loads the landing page

- **WHEN** an anonymous visitor navigates to `/`
- **THEN** the response SHALL be `200 OK` with HTML containing the hero headline copy
- **AND** the page SHALL include a primary CTA **Try the live demo** linking to `/login`
- **AND** the page SHALL include a secondary "Log in" link targeting `/login`
- **AND** the page SHALL NOT redirect to `/login` automatically

#### Scenario: Signed-in visitor is redirected to the dashboard

- **WHEN** a visitor with a valid session in `sessionStorage` navigates to `/`
- **THEN** the page SHALL redirect to `/dashboard` using the existing `HomeRedirect` behavior
- **AND** the landing page MUST NOT be rendered to signed-in users

#### Scenario: Deep-links remain intact

- **WHEN** any of the existing routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/check-email`, `/auth/verify-email`, `/dashboard`, `/dashboard/cv/new`, `/dashboard/cv/[id]`, etc.) is loaded directly
- **THEN** the route SHALL continue to render its existing page unchanged

### Requirement: The landing page SHALL demonstrate the PDF-to-MIT-format transform in the hero

The hero section renders a CSS product mock (`HeroVisual`) showing a Source PDF column and a Structured CV column with scan-line and reveal animations from `landing-animations.css`. The mock MUST NOT depend on `/recordings/showcase.mp4` or any `<video>` element on `/`.

For `prefers-reduced-motion: reduce`, animation keyframes in `landing-animations.css` MUST be disabled and the hero MUST render the static two-column compare without motion.

The page MUST use Geist Sans for marketing headlines (via `font-sans` utilities) within the Finley token palette defined in `(marketing)/globals.css`.

#### Scenario: Hero animation runs on first load

- **WHEN** an anonymous visitor loads the landing page for the first time with default motion preferences
- **THEN** the hero visual SHALL display the PDF-to-CV mock with CSS animation classes applied
- **AND** the animation SHALL complete without blocking first paint

#### Scenario: Reduced-motion users get the static fallback

- **WHEN** the user's operating system has `prefers-reduced-motion: reduce` set
- **THEN** the hero demo SHALL render a static two-column compare without motion
- **AND** landing animation classes MUST NOT animate

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

### Requirement: The landing page SHALL honor accessibility and reduced-motion requirements

The landing page MUST be responsive from a minimum viewport width of 360px upward. All interactive elements MUST show a visible focus ring using the existing `--ring` token. The page MUST respect `prefers-color-scheme: dark` and `prefers-reduced-motion: reduce`. Decorative SVG MUST have `aria-hidden="true"`. The FAQ MUST use semantic `<details>`/`<summary>` elements. The page MUST set `<html lang="en">`.

#### Scenario: Reduced motion disables all animations

- **WHEN** the user has `prefers-reduced-motion: reduce`
- **THEN** the page MUST set `animation-duration: 0.001s` and `animation-iteration-count: 1` on every landing-animation class
- **AND** MUST disable smooth scroll
- **AND** the hero MUST render the static two-column compare

#### Scenario: Visible focus ring on interactive elements

- **WHEN** a user keyboard-navigates to a button, link, or input on the landing page
- **THEN** the focused element SHALL display a visible focus ring using the `--ring` token
- **AND** the focus ring MUST meet WCAG 2.1 AA non-text contrast (3:1) against the adjacent surface

### Requirement: The landing page SHALL NOT introduce new third-party dependencies or server-side secrets

The landing page and its components MUST be importable from the public client bundle without pulling in `@supabase/supabase-js` (except via the existing auth-flow carve-out) or any `SUPABASE_*` server-side key. The page MUST NOT import the `framer-motion`, `gsap`, `lottie-web`, or any equivalent JavaScript animation library. The page MUST NOT make any HTTP request to `NEXT_PUBLIC_API_URL` on initial load.

The existing `web-bundle-security.test.ts` guard MUST continue to pass after the landing page is added.

#### Scenario: Bundle security guard remains green

- **WHEN** `pnpm test` is run from the workspace root
- **THEN** the `web-bundle-security.test.ts` Vitest suite SHALL pass
- **AND** the landing page source files SHALL NOT reference `SUPABASE_SERVICE_ROLE_KEY`, `service_role`, or any symbol from `apps/api/src/cv/**` or `apps/api/src/database/**`

#### Scenario: No third-party animation library is installed

- **WHEN** `pnpm install` is run after the change
- **THEN** the resulting `apps/web/package.json` `dependencies` MUST NOT include `framer-motion`, `motion`, `gsap`, `@lottiefiles/*`, `lottie-web`, `animejs`, or `popmotion`

### Requirement: The landing page SHALL be unit-tested at the route level

A colocated Vitest unit test MUST exist at `apps/web/src/app/(marketing)/page.test.tsx`. The test MUST assert, at minimum:

- For an anonymous visitor, the page renders the hero headline copy.
- For an anonymous visitor, every **Try the live demo** CTA renders with `href` equal to `/login`.
- The page does not import `hasSession` from a server context (static source guard).
- The header **Get Started Free** CTA points to `/register` with `landing-btn-primary` styling.

#### Scenario: Anonymous visitor sees the hero CTA

- **WHEN** the test renders the landing page with `hasSession()` returning `false`
- **THEN** the test SHALL find a primary CTA element with `href` equal to `/login`

#### Scenario: Signed-in visitor is redirected

- **WHEN** the test renders the landing page with `hasSession()` returning `true`
- **THEN** the test SHALL confirm that the landing page delegates to `HomeRedirect` and does not render the hero copy
