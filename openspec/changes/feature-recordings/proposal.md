## Why

The Resubuild landing page and README lack a visual demonstration of the product's core capability. The existing `showcase.gif` is a hand-dropped 5.3 MB GIF (1280x720, modified 2026-06-08) that shows the sign-in, dashboard, editor, and PDF export flow — but it was not produced by a reproducible script, it does not reflect the current UI, and it cannot be updated when the UI changes. A developer who updates the editor cannot regenerate the asset without manually recording and encoding it again.

More broadly, the product has seven distinct visual moments that are hard to communicate in a README table: the PDF import flow, the application preparation workspace, the cover-letter PDF export, the MCP API key setup, the passwordless login sequence, the registration flow, and the editor export. None of these are visible without installing and running the dev stack.

Feature recordings — short MP4 clips of each marquee interaction, driven by the live dev stack — solve both problems: they give prospective users a genuine preview of the product, they give developers a reproducible way to update the assets when the UI changes, and they provide concrete visual artifacts for the landing page hero, a new `/features` page, and the README showcase.

## What Changes

- Add a CLI driver (`scripts/recordings/record-features.mjs`) that launches a headless Chromium via Puppeteer, drives the live Next.js dev server at `http://localhost:3000`, and captures frames at 30 fps using `page.screenshot()`. The PNG frames are assembled into H.264 MP4 files using `ffmpeg` on the developer's machine. No recording runs in CI and no new API endpoint is added.
- Add a screenplay catalog (`scripts/recordings/screenplays.ts`) with eight screenplay functions: `pdf-import`, `application-prepare`, `cover-letter-pdf`, `mcp-key`, `login-passwordless`, `register`, `editor-export`, and `showcase` (a 15-second montage of the three most distinctive clips).
- Produce eight MP4 files (seven features plus the showcase) written to `apps/web/public/recordings/`. The files are gitignored (large binary artifacts); a `pnpm recordings` run is required after a fresh clone.
- The landing page hero (`add-landing-page`'s `hero.tsx`) replaces the CSS-only SVG animation with a `<video>` tag pointing to the showcase clip, with a `prefers-reduced-motion` fallback that shows only a static poster PNG.
- A new `/features` page at `apps/web/app/features/page.tsx` embeds one recording per feature with a heading and one-line description.
- The README showcase section (`README.md`) replaces the `showcase.gif` markdown image with an HTML `<video>` element pointing to the showcase MP4, and adds a "See all features" link to `/features`.
- A `?hide-dev-banner=1` query parameter is added to the auth pages so recordings can suppress the "Development" Mailpit banner that appears in localhost development.
- The OpenSpec `add-landing-page` change's hero spec is updated: the CSS-only animation requirement is relaxed, and a real recording produced by `scripts/recordings/record-features.mjs` becomes the deployment gate for the landing page.

## Capabilities

### New Capabilities

- `feature-recordings`: Dev-time CLI tooling that generates reproducible MP4 screen recordings of the Resubuild product by driving a headless Chromium against the live dev stack. The CLI takes a `--only=<id>` argument to run a single screenplay, `--fps=30` to override the frame rate, and `--out=<dir>` to override the output directory. The output naming contract is `<id>.mp4` and `<id>.png` (poster) for each feature and `<showcase.mp4>` / `<showcase.png>` for the montage. The recordings are static assets served from `apps/web/public/recordings/` and are gitignored. The CLI requires the dev stack to be running (`pnpm dev` or equivalent), `pnpm samples:seed` to have been run, `ffmpeg` to be on `PATH`, and — for the three AI-agent-dependent clips — an active AI agent account to be configured in `/dashboard/settings/ai-agent`.

### Modified Capabilities

- `landing-page`: The hero animation requirement is updated from "CSS-only @keyframes animation" to "a real MP4 recording of the live product (with a static poster fallback for `prefers-reduced-motion: reduce`)". A real recording produced by `scripts/recordings/record-features.mjs` is a deployment gate: the landing page MUST NOT be deployed to production if the recording is older than the most recent `add-landing-page` commit that modified any hero-adjacent component. — delta spec required.
- `visual-design-system`: No token changes. The marketing tokens are unchanged; the only change is that the hero now renders a `<video>` element instead of a CSS-animated SVG demo. The `--marketing-*` token family is unaffected. — no delta required.

## Impact

- **Code**: new files in `scripts/recordings/` (the driver, executor, screenplays catalog, README, and a Vitest ffmpeg test) and `apps/web/public/recordings/` (the output MP4/PNG files, gitignored). The landing page consumer modifies `apps/web/src/components/landing/hero.tsx` (removes `<HeroDemo>`, adds `<video>`). The `/features` consumer adds `apps/web/app/features/page.tsx` and `apps/web/src/components/features/feature-recording.tsx` plus a Vitest. The `hide-dev-banner` feature adds a three-line guard to `apps/web/src/lib/auth/dev-mailpit.ts`. No API, auth, or database changes.
- **Bundle security**: the new components import only `next/link`, `next/navigation`, `clsx`, and `tailwind-merge`. The `web-bundle-security.test.ts` guard continues to pass. The recordings are static assets in `public/`, not imported as ES modules.
- **Performance**: recordings are static assets; no runtime performance impact. The CLI adds no runtime code.
- **CI**: no CI changes. The recordings are generated by the developer locally, not in CI.
- **Developer experience**: the CLI requires `ffmpeg` on `PATH` (documented in `scripts/recordings/README.md`), the dev stack to be running, and seed data to exist. The three AI-agent-dependent screenplays require an active account in `/dashboard/settings/ai-agent`.
- **Bundle size**: `apps/web/public/` is served directly by Next.js without size limits. Eight MP4 files at 1280x720 H.264, 10-15 s each, total ~10-20 MB. Acceptable for marketing assets; a Supabase Storage migration path is documented in the OpenSpec spec as a follow-on.
- **Maintenance**: recordings drift when the UI changes. The spec asserts recordings MUST be regenerated when any hero-adjacent or feature-page component is modified. The `scripts/recordings/README.md` documents the regeneration workflow.
