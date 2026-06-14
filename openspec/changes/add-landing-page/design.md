## Context

Resubuild is an MIT-format CV builder. Its only marketing surface today is a one-line README banner; the root route `/` immediately redirects anonymous visitors to `/login`. New visitors never see the product's core thesis before being asked to commit. This change adds a public marketing landing page at `/` that earns the click through to sign-up by demonstrating the product's signature capability (PDF → clean CV) in the hero, then walks the visitor through Import → Edit → Export, and ends with a soft path to the live demo at `app.resubuild.dev`.

The change is contained to `apps/web`. The marketing page is composed entirely from server components, with two small `"use client"` islands (the animated hero demo and the session-aware header CTA). It reuses the existing `hasSession()` helper and the existing `HomeRedirect` component for the signed-in fast-path so authenticated users still land on the dashboard.

## Goals / Non-Goals

**Goals:**

- Add a public, marketing-grade landing page at `/` that demonstrates the PDF → MIT-format CV transform in the hero without a JS animation library.
- Preserve the existing auth-redirect contract for signed-in users (still go to `/dashboard`) and for deep-links to `/login`, `/register`, `/forgot-password`, etc.
- All animations are CSS-only, gated by `prefers-reduced-motion`.
- No new third-party dependencies. No Supabase, no service-role key, no API key. The web-bundle-security guard must continue to pass.
- Add a colocated Vitest unit test that asserts: anonymous users see the hero headline copy and a CTA linking to `app.resubuild.dev`; signed-in users are redirected to `/dashboard`.
- Page is responsive from 360px upward with visible focus rings and accessible semantics (single h1, semantic `<details>` for FAQ, `aria-hidden` on decorative SVG, `prefers-reduced-motion` honored).

**Non-Goals:**

- No internationalization (English only — the existing app is English-only; i18n is a separate change).
- No CMS, no MDX blog, no pricing page, no testimonials block. The page is a single static marketing surface, not a content platform.
- No tracking pixels or analytics integration. The existing web app does not have analytics; adding them is out of scope.
- No JS animation library (Framer Motion, GSAP, Lottie, etc.). Animations are CSS `@keyframes` + `IntersectionObserver` toggling a class.
- No change to the existing login / register / dashboard / editor routes or to the API.

## Decisions

### D1. Route group `(marketing)` rather than a new URL segment

The route group `apps/web/src/app/(marketing)/page.tsx` keeps the URL at `/` and groups all marketing-only files (page, layout, components) without leaking them into the URL space. The existing route group, if any, is not affected because route groups are file-system only.

**Alternatives considered:** `app/landing/page.tsx` at `/landing` — rejected; the brief asks for the root URL to be the landing page, and `/landing` is non-canonical for marketing. A `revalidate = false` segment at `/` directly — rejected; the route group gives us a clean layout boundary to load `landing-animations.css` and a marketing-only `metadata` override without polluting the root layout.

### D2. Server components by default, two client islands

The page is a server component. Only two pieces need client state:

1. `HeroDemo` — uses `IntersectionObserver` to replay the animation when scrolled into view, and listens to `prefers-reduced-motion` to render the static fallback.
2. `HeaderCta` — reads `hasSession()` to swap the primary CTA target between `https://app.resubuild.dev` (anonymous) and `/dashboard` (signed in).

Everything else (hero copy, features row, FAQ, footer, "How it works" steps) is plain JSX.

**Alternatives considered:** Make the whole page a client component — rejected; loses SSR for first paint and bloats the JS bundle. Use a third-party animation library — rejected per the non-goal.

### D3. Signature element: animated PDF → MIT-format CV transform

The hero's single orchestrated moment is a side-by-side comparison: a "scanned PDF" column (gray, slightly off-axis, with hand-drawn-look artifacts simulated as inline SVG noise) animates character-by-character into a clean MIT-format CV column (white, hairline rules, monospace dates). A 1px indigo scanline travels from the top of the left column to the bottom over 6 seconds; at the midpoint, the right column reveals line-by-line. The whole loop is 9 seconds; on scroll back into view it replays once.

The animation is implemented as four CSS `@keyframes`:

- `pdf-fade` — opacity 0.4 → 1 on the left column over 0–6s
- `scanline-travel` — translateY on the indigo line over 0–6s
- `cv-reveal` — clip-path inset on the right column, 3s–6s
- `cursor-blink` — caret opacity on the right column, 3s–6s (concurrent with reveal)

`HeroDemo` is a single `<svg>` of fixed width (480px) with a `<foreignObject>` containing the typed text spans. No third-party SVG, no canvas, no WebGL.

**Alternatives considered:** Numbered `01/02/03` "How it works" markers as the visual hook — rejected; the brief warns this is a templated default. A live iframe of the editor — rejected; depends on auth state and bloats the page with the editor bundle. A Lottie animation — rejected; requires a JSON file and a library.

### D4. Palette: paper + ink + indigo hairline, **not** a marketing default

The page deliberately uses the product's own visual language: the same paper-white surface, ink-black type, and hairline rules that appear inside the actual CV document, plus the existing `--primary` indigo for CTAs and active states. This is the most distinctive choice available because it makes the page feel like it _is_ the product — you scroll a clean CV, you arrive at a clean page.

Token additions in `globals.css` (under `:root` and `prefers-color-scheme: dark`):

- `--marketing-paper: 0 0% 100%` (light) / `--marketing-paper: 240 10% 5%` (dark) — the page background, layered over the existing `--background`
- `--marketing-ink: 240 10% 9%` (light) / `--marketing-ink: 0 0% 98%` (dark) — body text
- `--marketing-rule: 244 30% 55%` (light) / `--marketing-rule: 244 40% 65%` (dark) — section dividers, indigo at low alpha
- `--marketing-display-font: 'Instrument Serif', Georgia, serif` — display face for the hero h1
- `--marketing-mono-font: var(--font-geist-mono)` — already loaded

Instrument Serif is loaded from Google Fonts in `(marketing)/layout.tsx` via `next/font/google` with `display: 'swap'` and `preload: true` so it does not block first paint.

**Alternatives considered:** A warm cream background with terracotta accent — rejected per the frontend-design skill's calibration (this is the first of the three AI defaults). A near-black background with acid-green — rejected (this is the second default). A broadsheet newspaper layout — rejected (the third default, and doesn't fit a CV builder). The existing pure-indigo accent extended across the whole page — rejected; the page would feel like the dashboard, killing the marketing tone.

### D5. Typography: Instrument Serif display + Geist Sans body + Geist Mono dates

The display face (`Instrument Serif`, 400 weight only, used with restraint — hero h1 and the section h2 of "How it works") is a contemporary serif with a low-contrast, slightly art-deco personality. It contrasts with the geometric Geist Sans body without competing for attention. Geist Mono is reused from the root layout for utility labels and the simulated CV date column — the mono dates are the same device used in the printed CV template, encoding the subject in the type system.

Type scale: `clamp(2.75rem, 5vw + 1rem, 5.5rem)` for the hero h1, `clamp(1.75rem, 2vw + 1rem, 2.5rem)` for section h2s, `1rem` body, `0.875rem` for utility labels with `tracking: 0.08em` and `text-transform: uppercase` (the small-caps eyebrow pattern used by the MIT-format resume).

**Alternatives considered:** Use Geist Sans for the hero — rejected; the page would read as a generic SaaS landing. Use Fraunces or another Google serif — rejected; Instrument Serif's quiet, slightly art-deco feel is more distinctive against Geist's geometric clarity. Self-host a typeface — rejected per the non-goal of no new dependencies.

### D6. Section structure: hairline rules carry the layout

Five sections separated by 1px hairline rules (the `--marketing-rule` token) rather than colored bands or shadow cards. This is the same device used inside the CV document (where section headings are rule + caps text), and it lets the page feel like an extension of the product rather than a separate marketing template.

Sections in order:

1. **Hero** — display headline, one-line product line, primary CTA (`Try the live demo` → `app.resubuild.dev`) and secondary CTA (`See how it works` scrolls to section 2), animated demo.
2. **How it works** — three steps in a single horizontal row on desktop, stacked on mobile: `01` (Import PDF), `02` (Edit in the MIT-format editor), `03` (Export PDF). Numbered markers are used here _because the content is genuinely a sequence_ — Import must precede Edit, which must precede Export. The frontend-design skill explicitly endorses this use.
3. **Features** — four cards (AI extraction, MIT-format editor, one-click PDF export, private to your account) using the existing `surface-soft` utility from the visual design system. No new card pattern.
4. **Open standard** — short callout: "Built on the open JSON Resume schema. Export to JSON, HTML, or PDF." Links to `jsonresume.org`. Single column, max-width `40rem`.
5. **FAQ** — five `<details>`/`<summary>` elements covering: "Is the data private?", "What format is the export?", "Do I need an account?", "Can I import a non-PDF CV?", "Is there a free tier?"
6. **Footer** — minimal: `Resubuild` wordmark, three links (`Live demo`, `GitHub`, `Sign in`), copyright.

### D7. Animation system: CSS keyframes + IntersectionObserver, no library

A single CSS partial `apps/web/src/components/landing/landing-animations.css` defines:

- `@keyframes` for `pdf-fade`, `scanline-travel`, `cv-reveal`, `cursor-blink`, `section-reveal` (translateY 8px → 0 + opacity 0 → 1), `headline-stagger` (per-word translateY 12px → 0 with a staggered `animation-delay`).
- A `.is-in-view` class added by an `IntersectionObserver` in the page's root client wrapper that triggers `section-reveal` on every section as it scrolls into view (threshold 0.15, `rootMargin: 0px 0px -10% 0px`).
- A `@media (prefers-reduced-motion: reduce)` block that sets `animation-duration: 0.001s` and `animation-iteration-count: 1` on all `landing-*` classes, and disables `scroll-behavior: smooth` so reduced-motion users get instant navigation.

The `(marketing)/layout.tsx` imports the CSS partial via `import './landing-animations.css'`. This keeps the file colocated with the components and out of the root layout's global stylesheet.

**Alternatives considered:** Use Tailwind's `animate-*` utilities with `data-state` toggles — rejected; the section-reveal needs `IntersectionObserver` either way, and a custom keyframe is clearer. Use CSS `@view-timeline` for scroll-driven animation — rejected; Safari support is incomplete as of 2026-06 and the page must work everywhere. Use a JS library (Framer Motion / Motion One) — rejected per the non-goal.

### D8. SEO and metadata

The `(marketing)/layout.tsx` exports a `metadata` constant that overrides the root `metadata`:

- `title`: `Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.`
- `description`: `Resubuild extracts structured resume data from any PDF, lets you tweak it in a focused MIT-format editor, and exports a one-click PDF. Your CVs, your account.`
- `openGraph`: title, description, `images: ['/resubuild-banner.jpg']` (the existing public asset), `type: 'website'`.
- `twitter`: `card: 'summary_large_image'`, same image.
- `alternates.canonical`: `https://resubuild.dev/` (the README's canonical domain; we can update this when the actual domain is set).

The page emits a single `<h1>` (the hero headline) and a hierarchical `<h2>`/`<h3>` outline. JSON-LD is **not** added in this change (separate change if needed).

## Risks / Trade-offs

- **Risk:** Loading Instrument Serif adds a font request and could shift the hero layout on first paint. → **Mitigation:** Use `next/font/google` with `display: 'swap'` and a system-serif fallback (`Georgia`) so first paint shows Georgia, then swaps to Instrument Serif when the font loads. The hero reserves vertical space with a fixed `min-height` so the swap does not reflow.
- **Risk:** A heavy marketing page hurts the Core Web Vitals score. → **Mitigation:** Page is server-rendered, all animations are CSS-only and respect reduced motion, no third-party scripts, no large images (the hero demo is a single inline SVG of ~6KB), and the existing root layout already preloads Geist Sans + Geist Mono.
- **Risk:** The `web-bundle-security.test.ts` guard could fail if the landing page accidentally imports a server-only key. → **Mitigation:** The landing page imports only `next/link`, `next/navigation`, `clsx`, `tailwind-merge`, and shadcn/ui primitives. The implementation adds a unit test that greps the page tree for `SUPABASE_SERVICE_ROLE_KEY` and `service_role` to mirror the guard's intent.
- **Risk:** Replacing the `/` redirect breaks the existing E2E flow. → **Mitigation:** The signed-in path is unchanged. The E2E tests are updated to navigate to `/login` directly (see the E2E test impact section in `tasks.md`). A new E2E scenario covers the anonymous landing page experience.
- **Risk:** Hero demo animation feels gimmicky on slow devices. → **Mitigation:** The reduced-motion fallback is a static two-column compare, not just a paused animation. We also detect `prefers-reduced-motion: reduce` from the start, not after the animation has already played.
- **Trade-off:** A marketing page is not the product — it can never replace the editor. The page is intentionally light on detail and heavy on demonstration. The "Try the live demo" CTA is the bridge; the product itself does the rest.

## Migration Plan

1. Land the change behind no flag (no runtime config gate).
2. Deploy `apps/web` to the staging environment; visually verify the hero, section reveals, and reduced-motion fallback.
3. Run `pnpm verify` (Biome + Prettier + typecheck + unit tests + build) on the workspace; expect all green.
4. Run `pnpm test:e2e` against local Supabase; expect the updated scenarios to pass and the new landing-page scenario to pass.
5. Roll back by reverting the commit if the dashboard redirect or the login flow is broken.

## Open Questions

- **Canonical domain for `metadata.alternates.canonical`.** The README uses `resubuild.dev` and `app.resubuild.dev`. We use `https://resubuild.dev/` in the metadata; we should confirm with the operator which domain the marketing page should canonicalize to before the first prod deploy.
- **Should the landing page be indexed by crawlers in the local development build?** Currently `pnpm dev` is reachable, and the page is not gated by `NODE_ENV`. The metadata does not include a `noindex` directive, which is correct for production but means a developer running `pnpm dev` exposes a `/` route to any crawler that hits `http://localhost:3000`. Localhost-only crawlers are not a real concern, so we leave this as-is.
- **FAQ content.** The five questions listed in D6 are placeholder copy. The operator should review them before the first prod deploy.
