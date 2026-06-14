## 1. OpenSpec artifacts

- [ ] 1.1 Confirm `openspec/changes/feature-recordings/proposal.md` is written with Why, What Changes, Capabilities, Impact
- [ ] 1.2 Confirm `openspec/changes/feature-recordings/design.md` is written with Context, Goals/Non-Goals, Decisions (D1-D8), Risks/Trade-offs, Migration Plan, Open Questions
- [ ] 1.3 Confirm `openspec/changes/feature-recordings/specs/feature-recordings/spec.md` is written with all requirements and scenarios
- [ ] 1.4 Confirm `openspec status --change feature-recordings` shows `isComplete: true`

## 2. CLI driver scaffold

- [ ] 2.1 Create `scripts/recordings/executor.ts` — the `Executor` class with `goto`, `click`, `type`, `waitFor`, `wait`, `screenshot`, `uploadFile` methods and the frame-capture loop
- [ ] 2.2 Create `scripts/recordings/record-features.mjs` — the CLI entrypoint with `--only`, `--fps`, `--out` args, the screenplay runner loop, and the ffmpeg assembly step
- [ ] 2.3 Create `scripts/recordings/README.md` — operator guide: prerequisites (pnpm dev, pnpm samples:seed, ffmpeg, AI agent for clips 1-3), usage (`pnpm recordings`, `pnpm recordings --only=pdf-import`), re-record workflow, troubleshooting
- [ ] 2.4 Create `apps/web/public/recordings/.gitignore` — ignore `*.mp4` and `*.png`
- [ ] 2.5 Create `apps/web/public/recordings/.gitkeep` — placeholder so the directory is tracked

## 3. Screenplay catalog

- [ ] 3.1 Create `scripts/recordings/screenplays.ts` — export a `SCREENPLAYS` record mapping id to screenplay function
- [ ] 3.2 Implement `pdf-import` screenplay: login, navigate to `/dashboard/cv/new/import/file`, upload a sample PDF, wait for job completion, click Preview, click Save, capture frames from upload through editor load
- [ ] 3.3 Implement `application-prepare` screenplay: login, navigate to `/dashboard/applications/new`, fill textarea with canned job description, click Prepare, wait for workspace, switch to Tailored CV tab
- [ ] 3.4 Implement `cover-letter-pdf` screenplay: navigate to an existing application workspace (requires application-prepare to have run), switch to Cover letter tab, click PDF button
- [ ] 3.5 Implement `mcp-key` screenplay: navigate to `/dashboard/settings/mcp?hide-dev-banner=1`, assert MCP enabled, click Create API key, wait for the secret banner, click Copy to clipboard
- [ ] 3.6 Implement `login-passwordless` screenplay: navigate to `/login?hide-dev-banner=1`, switch to Email code tab, enter developer email, click Send code, auto-fetch OTP from Mailpit HTTP API, enter code, verify redirect to dashboard
- [ ] 3.7 Implement `register` screenplay: navigate to `/register?hide-dev-banner=1`, fill fresh email and password, click Register, handle either auto-login or check-email redirect
- [ ] 3.8 Implement `editor-export` screenplay: login, navigate to `/dashboard`, click first CV, click Preview, scroll to show sections, click Download PDF
- [ ] 3.9 Implement `showcase` screenplay: run pdf-import, application-prepare, and editor-export back-to-back with 1-second crossfade transitions between segments using ffmpeg's `xfade` filter

## 4. ffmpeg integration and test

- [ ] 4.1 In `record-features.mjs`, after capturing all frames for a clip, shell out to ffmpeg with: `ffmpeg -framerate 30 -i <temp-dir>/frame-%04d.png -c:v libx264 -pix_fmt yuv420p -movflags +faststart <out.mp4>`
- [ ] 4.2 For the showcase montage, use ffmpeg's `xfade` filter to crossfade between the three segments with 1-second transitions
- [ ] 4.3 Generate a poster PNG as the first frame: `ffmpeg -i <out.mp4> -vf "select=eq(n\,0)" -vframes 1 <out.png>`
- [ ] 4.4 Create `scripts/recordings/ffmpeg.test.mjs` — Vitest unit test that calls the ffmpeg command on a synthetic 3-frame PNG sequence and asserts the output is a valid MP4 with `ffprobe` (checks for `codec_type=video` in the output)

## 5. Package scripts

- [ ] 5.1 Add to root `package.json`: `"recordings": "node scripts/recordings/record-features.mjs"` and `"recordings:pdf-import": "node scripts/recordings/record-features.mjs --only=pdf-import"` (and one per feature id)
- [ ] 5.2 Confirm `pnpm recordings` is listed in the scripts section alongside `samples:seed` and `samples:pdf`

## 6. hide-dev-banner flag

- [ ] 6.1 In `apps/web/src/lib/auth/dev-mailpit.ts`, add: `const hideBanner = new URLSearchParams(window.location.search).get('hide-dev-banner') === '1'`; when `true`, return `null` from the hook without rendering the banner

## 7. Landing page hero consumer

- [ ] 7.1 In `apps/web/src/components/landing/hero.tsx`, replace the `<HeroDemo>` client island with:
  ```tsx
  <video
    src="/recordings/showcase.mp4"
    poster="/recordings/showcase.png"
    autoPlay
    muted
    loop
    playsInline
    className="w-full rounded-xl"
    aria-label="Resubuild demo"
  />
  ```
- [ ] 7.2 Add a `prefers-reduced-motion` media query CSS block that hides the `<video>` and shows only the `<img poster="/recordings/showcase.png" alt="Resubuild demo" />` instead
- [ ] 7.3 Confirm the static poster renders when `prefers-reduced-motion: reduce` is set

## 8. /features page consumer

- [ ] 8.1 Create `apps/web/app/features/page.tsx` — server component rendering the features page layout with metadata
- [ ] 8.2 Create `apps/web/src/components/features/feature-recording.tsx` — component with props `id`, `title`, `caption` that renders the `<video>` with the matching `src` and `poster`
- [ ] 8.3 Add a `prefers-reduced-motion` check (via `useServerValue('prefers-reduced-motion')` or a CSS class) that falls back to the poster image
- [ ] 8.4 Create `apps/web/src/components/features/feature-recording.test.tsx` — Vitest asserting: renders a `<video>` with correct src and poster, has `autoPlay muted loop playsinline`, and the reduced-motion fallback shows an `<img>` instead

## 9. README consumer

- [ ] 9.1 In `README.md`, replace `![Resubuild showcase](./showcase.gif)` with:
  ```html
  <video
    controls
    autoplay
    muted
    loop
    playsinline
    style="max-width:100%;border-radius:0.75rem;"
    src="apps/web/public/recordings/showcase.mp4"
  >
    <a href="/features">See all features</a>
  </video>
  ```
- [ ] 9.2 Add a "See all features" link line: `- [Features](/features) — video walkthroughs of every major feature`
- [ ] 9.3 Delete `showcase.gif` from the repo root (`git rm showcase.gif`)
- [ ] 9.4 Add `showcase.gif` to `.gitignore` if not already present

## 10. Delta to add-landing-page spec

- [ ] 10.1 In `openspec/changes/add-landing-page/specs/landing-page/spec.md`, add a `## MODIFIED Requirements` section updating the hero animation requirement:
  - Change "The hero section MUST demonstrate the PDF-to-MIT-format transform in the hero" to "The hero section SHALL render a real MP4 recording of the product's core workflow (showcase.mp4) with a static poster fallback for reduced-motion users."
  - Remove or soften the "CSS-only animation" requirement; the real recording is the new requirement.
- [ ] 10.2 In `openspec/changes/add-landing-page/design.md`, update D3 to reference the recording instead of the CSS SVG animation
- [ ] 10.3 In `openspec/changes/add-landing-page/tasks.md`, add task group 8: "Generate recordings" with prerequisite checks (ffmpeg, dev stack, seed, AI agent) and the `pnpm recordings` run step

## 11. Bundle security and quality gates

- [ ] 11.1 Verify `apps/web/src/lib/web-bundle-security.test.ts` still passes after landing page and features page changes
- [ ] 11.2 Run `pnpm --filter web typecheck` — zero errors
- [ ] 11.3 Run `pnpm --filter web lint -- --fix` — zero Biome errors
- [ ] 11.4 Run `pnpm --filter web format` — Prettier passes
- [ ] 11.5 Run `pnpm --filter web build` — Next.js build succeeds
- [ ] 11.6 Run `pnpm --filter web test -- --run` — all Vitest tests pass including the new `feature-recording.test.tsx`

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — entire catalog from `openspec/specs/e2e-testing/spec.md`: auth (login + /auth/me), CV (list/get seeded; profile photo; skills reorder; work patch), media (public GET; authenticated upload; owner meta), export (GET /cv/export/templates; HTML; JSON export smoke), template presentation (GET defaults; PATCH hidden sections), lifecycle (PATCH template + basics; DELETE ephemeral CV), sections (basics/education/languages GET; work create + delete), AI agent (providers; active unconfigured), import LLM (providers; config unconfigured), import URL (rejects invalid URLs with 400), MCP (initialize + tools/list + 20+ tools + 3 resources + per-tool invocations + key limits + revoked-key 401 + JWT 401 on /mcp). The feature-recordings change is pure CLI tooling + static asset consumers; no API surface, auth flow, or persistence contract is modified.

### Update required

- None — no existing E2E scenario covers the new pages or the landing page hero element.

### Add

- `apps/web/src/components/features/feature-recording.test.tsx` — Vitest asserting the `<video>` element renders with correct src/poster and the `prefers-reduced-motion` fallback shows an `<img>`.
- `scripts/recordings/ffmpeg.test.mjs` — Vitest asserting the ffmpeg assembly produces a valid H.264 MP4 header from a synthetic 3-frame PNG input.
