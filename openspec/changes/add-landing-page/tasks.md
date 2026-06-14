## 1. Marketing route group and layout

- [ ] 1.1 Create `apps/web/src/app/(marketing)/layout.tsx` as a server component that imports `Instrument Serif` via `next/font/google` with `display: 'swap'` and exposes the font as `--marketing-display-font` via a CSS variable. Import the landing CSS partial (`./landing-animations.css`).
- [ ] 1.2 Export a `metadata` constant from `(marketing)/layout.tsx` overriding the root `metadata`: `title` "Resubuild — Drop in a PDF. Get a clean MIT-format CV in seconds.", matching `description`, `openGraph` and `twitter` cards using `/public/resubuild-banner.jpg`, and `alternates.canonical: 'https://resubuild.dev/'`.
- [ ] 1.3 Render the marketing layout: a `<header>` slot at the top of `{children}` (the page provides the header) and a `<main>` wrapper. Do not set a `body` background here — the marketing tokens override the surface inside this layout's children only.

## 2. Marketing tokens in `globals.css`

- [ ] 2.1 In `apps/web/src/app/globals.css`, under `:root` (light) and `@media (prefers-color-scheme: dark)`, add the `--marketing-*` token family: `--marketing-paper`, `--marketing-ink`, `--marketing-rule`, `--marketing-display-font`, `--marketing-mono-font`. Use the values from the visual-design-system delta spec (paper pure white / near-black, ink near-black / near-white, rule a low-alpha indigo, mono font reuses `--font-geist-mono`).
- [ ] 2.2 Confirm the existing `--background`, `--foreground`, and accent tokens are unchanged and that the existing shadcn-style components still resolve to the same accent color.

## 3. Landing components

- [ ] 3.1 Create `apps/web/src/components/landing/landing-animations.css` with `@keyframes` for `pdf-fade`, `scanline-travel`, `cv-reveal`, `cursor-blink`, `section-reveal`, and `headline-stagger`. Add the `.is-in-view` class that triggers `section-reveal` once. Add a `@media (prefers-reduced-motion: reduce)` block that disables all `landing-*` animations and sets `scroll-behavior: auto`.
- [ ] 3.2 Create `apps/web/src/components/landing/hero.tsx` (server component) with the display h1, the one-line product line, primary CTA (`Try the live demo` → `https://app.resubuild.dev`), secondary CTA (`See how it works` → in-page anchor), and the `<HeroDemo>` client island.
- [ ] 3.3 Create `apps/web/src/components/landing/hero-demo.tsx` as a `"use client"` component. Use `IntersectionObserver` to add `.is-in-view` on first entry; on subsequent entries, reset the animation by toggling `.is-in-view` off and back on. Read `window.matchMedia('(prefers-reduced-motion: reduce)')` once on mount and render the static two-column compare when reduced motion is requested.
- [ ] 3.4 Create `apps/web/src/components/landing/how-it-works.tsx` (server) with three steps (`01` Import PDF, `02` Edit in the MIT-format editor, `03` Export PDF). Use the existing eyebrow + caps pattern for the step number; the content is a real sequence, so numbered markers are appropriate here.
- [ ] 3.5 Create `apps/web/src/components/landing/features.tsx` (server) with four cards styled with the existing `surface-soft text-card-foreground` utility. Cards: AI extraction, MIT-format editor, one-click PDF export, private to your account.
- [ ] 3.6 Create `apps/web/src/components/landing/open-standard.tsx` (server) with a short callout linking to `https://jsonresume.org` and naming the JSON Resume schema.
- [ ] 3.7 Create `apps/web/src/components/landing/faq.tsx` (server) with five `<details>`/`<summary>` items: "Is the data private?", "What format is the export?", "Do I need an account?", "Can I import a non-PDF CV?", "Is there a free tier?".
- [ ] 3.8 Create `apps/web/src/components/landing/footer.tsx` (server) with the Resubuild wordmark, three links (`Live demo`, `GitHub`, `Sign in`), and a copyright line.
- [ ] 3.9 Create `apps/web/src/components/landing/header-cta.tsx` as a `"use client"` component. On mount, read `hasSession()` from `apps/web/src/lib/auth-session.ts`. Render the primary CTA pointing to `https://app.resubuild.dev` (anonymous) or `/dashboard` (signed in), plus a "Log in" link to `/login` (always visible for anonymous users; the link is omitted when signed in).

## 4. Marketing page

- [ ] 4.1 Create `apps/web/src/app/(marketing)/page.tsx` as a server component that:
  - Calls `hasSession()` from the server equivalent (`apps/web/src/lib/auth-session.ts` re-export) and, if true, renders `<HomeRedirect />` (the existing fast-path).
  - Otherwise renders the marketing surface: `<HeaderCta />`, `<Hero />`, `<HowItWorks />`, `<Features />`, `<OpenStandard />`, `<Faq />`, `<Footer />`, separated by 1px `--marketing-rule` hairlines.
  - The page returns exactly one `<h1>` (in `<Hero />`).
- [ ] 4.2 Remove the existing top-level `apps/web/src/app/page.tsx` only if the new `(marketing)/page.tsx` fully replaces it. Verify that no other file in `apps/web/src/app/` imports from the old page.

## 5. Unit tests

- [ ] 5.1 Create `apps/web/src/app/(marketing)/page.test.tsx` (Vitest, colocated). Mock `apps/web/src/lib/auth-session` so `hasSession` is controllable. Assert:
  - With `hasSession()` returning `false`, the rendered tree contains the hero h1 text and a primary CTA link with `href` `https://app.resubuild.dev`.
  - With `hasSession()` returning `true`, the page delegates to `HomeRedirect` and does not render the hero h1.
  - The rendered source tree does not contain the string `SUPABASE_SERVICE_ROLE_KEY` or `service_role`.
- [ ] 5.2 Verify that `apps/web/src/lib/web-bundle-security.test.ts` still passes. Add a no-op assertion (or an `it.skip`) only if the existing guard already covers landing components by directory glob; do not edit the guard's allowlist.

## 6. Documentation

- [ ] 6.1 In `README.md`, add a one-line note under "What it does" stating that the public marketing entry is `/` and that deep-links to `/login`, `/register`, `/forgot-password`, etc. continue to work.
- [ ] 6.2 Update the "API" link block in `README.md` to keep the `app.resubuild.dev` badge as the primary entry; the landing page is the same destination.

## 8. Recording generation (feature-recordings integration)

Recording generation is implemented by the `feature-recordings` OpenSpec change. This task group wires those recordings into the landing page.

- [ ] 8.1 Confirm `scripts/recordings/record-features.mjs` is present and `pnpm recordings` runs without error when the dev stack is up
- [ ] 8.2 Run `pnpm recordings` and verify 8 MP4 files appear in `apps/web/public/recordings/`
- [ ] 8.3 Verify `apps/web/src/components/landing/hero-video.tsx` is wired into `(marketing)/page.tsx` with the `showcase.mp4` src and poster
- [ ] 8.4 Verify the `/features` page at `apps/web/src/app/features/page.tsx` renders all 7 `<FeatureRecording>` components
- [ ] 8.5 Verify `README.md` shows the video showcase section and "See all features" link
- [ ] 8.6 After first recording run, confirm `apps/web/public/recordings/showcase.mp4` exists — the landing page hero depends on it being present

## 7. Quality gates

- [ ] 7.1 Run `pnpm --filter web test -- --run` (Vitest, single fork) and confirm all web unit tests pass, including the new `page.test.tsx` and the existing `web-bundle-security.test.ts`.
- [ ] 7.2 Run `pnpm --filter web typecheck` and confirm zero errors. (Use `--run` per project convention for any test commands.)
- [ ] 7.3 Run `pnpm format` then `pnpm lint` (Biome + Prettier with the Tailwind class-sort plugin) on the touched files.
- [ ] 7.4 Run `pnpm verify` at the workspace root (full pipeline: format, lint, typecheck, unit tests, build) and confirm all green.
- [ ] 7.5 In a local browser, load `http://localhost:3000/`:
  - With no session: confirm the hero renders, the primary CTA links to `app.resubuild.dev`, the secondary CTA scrolls to the "How it works" section, the hero demo plays once and replays on scroll-back, and toggling `prefers-reduced-motion` in DevTools shows the static two-column compare without animation.
  - With a session in `sessionStorage`: confirm the page redirects to `/dashboard`.
  - Resize to 360px width: confirm the page is readable, all CTAs are reachable, and the hero demo stacks below the headline.
- [ ] 7.6 Run `pnpm test:e2e` against the local Supabase stack. The change is UI-only — all existing E2E scenarios must continue to pass unchanged (see E2E test impact below). E2E is optional for pure UI work; the guard is that no `apps/api/test/e2e/*.e2e-spec.ts` is edited.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — all scenarios from the **Test catalog (current)** section of `openspec/specs/e2e-testing/spec.md`: auth (login fixture user; `/auth/me`; 401 without token), CV (list/get seeded; profile photo assignment; reject invalid POST; skills reorder; work patch by row id), media (public GET; owner meta; authenticated upload; 401 without token), export (`GET /cv/export/templates`; HTML export; JSON export smoke), template presentation (GET defaults; PATCH hidden sections round-trip), lifecycle (PATCH template + basics; DELETE ephemeral CV), sections (basics/education/languages GET; work create + delete by row id), AI agent (`/ai/agents/providers`; `/ai/agents/active` unconfigured), import LLM (`/import/llm/providers`; `/import/llm/config` unconfigured), import URL (`POST /cv/import/from-url` rejects invalid URLs with 400), MCP (initialize round-trip; `tools/list` matches `MCP_TOOL_NAMES`; `resources/templates/list` matches the 3 `resumind://` templates; per-tool invocation contracts; key limits; catalog exclusions; revoked-key 401; JWT 401 on `/mcp`).

### Update required

- None — this change does not modify any API, auth, media, or CV persistence contract. Per the e2e-testing spec's **UI-only styling change** scenario, no edits are made to `local-supabase.e2e-spec.ts`.

### Add

- `apps/web/src/app/(marketing)/page.test.tsx` — Vitest for the landing page route (anonymous vs. signed-in redirect).
- `apps/web/src/components/features/feature-recording.test.tsx` — Vitest for the `<FeatureRecording>` component (video vs. reduced-motion poster).
- `scripts/recordings/ffmpeg.test.mjs` — Vitest asserting the ffmpeg assembly produces a valid H.264 MP4 header from a synthetic PNG sequence.
