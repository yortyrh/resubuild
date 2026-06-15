# landing-page Specification

## Purpose

Define the public marketing surface for Resubuild: a single Next.js App Router page at `/` that demonstrates the product's signature capability (PDF → MIT-format CV) in the hero, walks the visitor through Import → Edit → Export, and ends with a soft path to the live demo at `app.resubuild.dev`. The page MUST respect `prefers-reduced-motion`, MUST NOT introduce third-party animation libraries, and MUST NOT pull Supabase or service-role keys into the client bundle.

## Requirements

### Requirement: The web app SHALL render a public landing page at `/` for anonymous visitors

The App Router SHALL provide a public route at `/` that, for an anonymous visitor (no session in `sessionStorage`), renders a marketing landing page instead of redirecting to `/login`. The page MUST be reachable at exactly `/` and MUST NOT add a new URL segment (e.g. `/landing`). The page MUST be implemented inside a route group so the URL stays at `/`.

The landing page MUST be a server component by default. Two small `"use client"` islands are allowed: an animated hero demo (uses `IntersectionObserver` to replay on scroll) and a session-aware header CTA (reads `hasSession()` to swap its target).

#### Scenario: Anonymous visitor loads the landing page

- **WHEN** an anonymous visitor navigates to `/`
- **THEN** the response SHALL be `200 OK` with HTML containing the hero headline copy
- **AND** the page SHALL include a primary CTA linking to `https://app.resubuild.dev`
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

The hero section renders a real screen recording of the product performing the PDF-import transformation. The recording is a static asset at `/recordings/showcase.mp4` produced by `scripts/recordings/record-features.mjs`.

The hero MUST render:

```tsx
<video
  src="/recordings/showcase.mp4"
  poster="/recordings/showcase.png"
  autoPlay
  muted
  loop
  playsInline
  aria-label="Resubuild demo: import a PDF, edit your CV, export a polished resume"
/>
```

For `prefers-reduced-motion: reduce`, the hero renders only the poster image:

```tsx
<img
  src="/recordings/showcase.png"
  alt="Resubuild demo: import a PDF, edit your CV, export a polished resume"
/>
```

The page MUST include the `Instrument Serif` typeface from Google Fonts for the hero display face, loaded via `next/font/google` with `display: 'swap'` and a system-serif fallback.

**Deployment gate**: the landing page MUST NOT be deployed if the recording at `/recordings/showcase.mp4` is older than the most recent commit that modified any component in the hero's visual proximity (defined as `apps/web/src/components/landing/` or `apps/web/src/app/(marketing)/`). This is an assertion enforced by the operator, not a technical guard.

#### Scenario: Hero animation runs on first load

- **WHEN** an anonymous visitor loads the landing page for the first time
- **THEN** the hero demo SHALL play its 9-second animation cycle automatically
- **AND** the animation SHALL complete without blocking first paint

#### Scenario: Hero animation replays on scroll

- **WHEN** the user scrolls past the hero and then scrolls back into view
- **THEN** the hero demo SHALL replay its animation exactly once per re-entry into the viewport

#### Scenario: Reduced-motion users get the static fallback

- **WHEN** the user's operating system has `prefers-reduced-motion: reduce` set
- **THEN** the hero demo SHALL render a static two-column compare (scanned PDF on the left, MIT-format CV on the right) without any motion
- **AND** the page MUST NOT call `IntersectionObserver` for animation replay in this state

### Requirement: The landing page SHALL include the required marketing sections in a defined order

The landing page MUST compose, in this exact order:

1. **Header** — a sticky top bar with the Resubuild wordmark on the left, a "Log in" link, and the primary CTA (whose target depends on session state).
2. **Hero** — display headline, one-line product line, primary CTA, secondary CTA, animated demo.
3. **How it works** — three numbered steps (`01` Import PDF, `02` Edit in the MIT-format editor, `03` Export PDF). The numbered markers are used here because the content is genuinely a sequence (each step depends on the previous one); they MUST NOT be reused as decoration elsewhere on the page.
4. **Features** — four feature cards (AI extraction, MIT-format editor, one-click PDF export, private to your account) styled with the existing `surface-soft` utility from the visual design system.
5. **Open standard** — a short callout linking to `jsonresume.org` and naming the JSON Resume schema as the export format.
6. **FAQ** — a minimum of five `<details>`/`<summary>` items covering data privacy, export format, account requirement, non-PDF imports, and pricing.
7. **Footer** — wordmark, three links (`Live demo`, `GitHub`, `Sign in`), copyright line.

The page MUST contain exactly one `<h1>` (the hero headline) and a hierarchical `<h2>`/`<h3>` outline below it.

#### Scenario: All required sections render in order

- **WHEN** the landing page loads
- **THEN** the rendered DOM SHALL contain a single `<h1>` element
- **AND** SHALL contain section landmarks for Header, Hero, How it works, Features, Open standard, FAQ, and Footer in that order
- **AND** SHALL contain at least five `<details>` elements under the FAQ section

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

A colocated Vitest unit test MUST exist at `apps/web/src/app/(marketing)/page.test.tsx` (or equivalent). The test MUST assert, at minimum:

- For an anonymous visitor, the page renders the hero headline copy.
- For an anonymous visitor, the primary CTA renders with `href` equal to `https://app.resubuild.dev`.
- For a signed-in visitor, the page short-circuits to a redirect to `/dashboard` (using the existing `HomeRedirect`).
- The page does not import `SUPABASE_SERVICE_ROLE_KEY` or `service_role` anywhere in the rendered tree.

#### Scenario: Anonymous visitor sees the hero CTA

- **WHEN** the test renders the landing page with `hasSession()` returning `false`
- **THEN** the test SHALL find a primary CTA element with `href` equal to `https://app.resubuild.dev`

#### Scenario: Signed-in visitor is redirected

- **WHEN** the test renders the landing page with `hasSession()` returning `true`
- **THEN** the test SHALL confirm that the landing page delegates to `HomeRedirect` and does not render the hero copy
