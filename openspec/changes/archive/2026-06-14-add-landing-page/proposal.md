## Why

The marketing surface for Resubuild is currently a one-line README banner and an instant redirect to `/login`. New visitors land on `/`, get bounced to a login form, and have no moment of orientation — no demonstration of the core thesis ("drop in a PDF, get a clean MIT-format CV in seconds"), no proof, no path forward other than the auth wall. A first-time visitor who arrived to evaluate the product never sees it before being asked to commit. We need a public landing page that earns the click through to sign-up by showing the product's distinctive capability the moment the page loads.

## What Changes

- Add a new public route `/` that renders a marketing landing page instead of immediately redirecting to `/login` or `/dashboard`. Logged-in users still get bounced to `/dashboard` so the dashboard remains the workspace for returning users.
- Build the landing page as a single Next.js App Router page in `apps/web/src/app/(marketing)/page.tsx` (route group, no URL segment change) that composes dedicated landing components under `apps/web/src/components/landing/`.
- The page is **server-rendered** by default, with two small `"use client"` islands for the animated "PDF → clean CV" hero demo and a header nav that shifts its CTA target based on session state.
- Hero section: a large display headline, a one-sentence product line, primary CTAs (`Try the live demo` → `https://app.resubuild.dev`, `See how it works` scrolls to the demo), and an animated before/after CV transform that runs on page load and replays on scroll into view.
- Sections (in order): Hero with animated transform, three-step "How it works" (Import → Edit → Export), feature row (AI extraction, MIT-format editor, one-click PDF, private account), "Built on the open JSON Resume standard" callout linking to `jsonresume.org`, FAQ accordion, and footer.
- A "Log in" link in the header is always visible; the primary CTA switches between `Try the live demo` and `Go to dashboard` based on the same `hasSession()` helper the existing `HomeRedirect` already uses, so the auth wall is preserved for new visitors.
- A `prefers-reduced-motion: reduce` media query disables all CSS animations and transitions on the page.
- A Vitest unit test colocated next to the new landing page (`page.test.tsx`) asserts: the public route renders the headline copy when no session is present, the primary CTA links to `app.resubuild.dev`, and the page short-circuits to a redirect when a session is present.
- README updated to point at `/` as the public entry (the existing `app.resubuild.dev` link still works; this just adds a marketing surface in front of it).

## Capabilities

### New Capabilities

- `landing-page`: Public marketing surface for Resubuild — a Next.js App Router route at `/` that composes a server-rendered hero, animated PDF-to-CV transform demo, "How it works" steps, feature highlights, FAQ, and footer; uses CSS animations (not JS animation libraries), respects `prefers-reduced-motion`, and preserves the existing auth redirect for signed-in users.

### Modified Capabilities

- `web-application`: The root route `/` no longer unconditionally renders the session-check redirect. It renders a marketing landing page when no session exists and still redirects to `/dashboard` when a session is present. (Spec-level behavior change: anonymous users get the landing page instead of an instant redirect to `/login`.) — delta spec required.
- `visual-design-system`: Landing page chrome introduces a small set of marketing-only tokens (a muted marketing surface, a hero display scale, a page-section spacing rhythm) layered on top of the existing semantic tokens. No changes to the existing accent palette or shadcn component styling. — delta spec required.

## Impact

- **Code**: new files in `apps/web/src/app/(marketing)/page.tsx`, `apps/web/src/app/(marketing)/layout.tsx`, `apps/web/src/components/landing/*` (hero, demo, steps, features, faq, footer, header-cta, animations.css), and `apps/web/src/app/(marketing)/page.test.tsx`. The existing `apps/web/src/components/auth/home-redirect.tsx` is reused as the signed-in fast-path; the `(marketing)` route group's `page.tsx` is the new entry.
- **Routing**: introduces an `app/(marketing)/` route group. The group is purely organizational — the URL `/` is unchanged. No conflict with existing `/login`, `/register`, `/dashboard`, etc. because those are siblings of the group, not inside it.
- **Animations**: CSS-only via a `landing-animations.css` partial loaded in the `(marketing)/layout.tsx`. Keyframes for the PDF-to-CV transform, the floating cursor, the section-reveal on scroll (using `IntersectionObserver` toggling a class), and the headline word stagger. Reduced-motion variant in the same file.
- **Bundle security guard**: the existing `web-bundle-security.test.ts` allows `@supabase/supabase-js` only in auth-flow scope. The landing page does not import Supabase or any server-only key. The test must continue to pass — the landing page imports only `next/link`, `next/navigation`, shadcn/ui components, and `clsx` / `tailwind-merge` for class composition.
- **Accessibility**: the page is responsive from 360px upward, all interactive elements have visible focus rings using the existing `--ring` token, motion is gated by `prefers-reduced-motion`, headings are in a single h1 → h2 → h3 order, decorative SVG gets `aria-hidden`, and the FAQ uses semantic `<details>` elements with summary text.
- **E2E tests**: the existing E2E flow visits `/` and expects a redirect to `/login` for anonymous users and to `/dashboard` for signed-in users. The new behavior preserves the **signed-in → `/dashboard`** path exactly. The **anonymous → `/login`** redirect is replaced by **anonymous → landing page** with a `<Link href="/login">` from the header. The E2E specs need to be updated to navigate to `/login` directly (or to click the "Log in" link) instead of relying on the `/` redirect. See the E2E test impact section in `tasks.md`.
- **Performance**: page is server-rendered (no client component on first paint), animations are CSS-only (no JS animation library), and the hero demo is a small SVG with CSS transforms — no large images, no third-party fonts beyond the existing Geist + Geist Mono from the root layout.
- **README**: the existing badge / link to `app.resubuild.dev` stays; we add a one-line note that the public marketing entry is `/` and direct deep-links (e.g. `/login`, `/register`) still work as before.
