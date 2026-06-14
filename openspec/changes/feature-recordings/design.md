## Context

Resubuild is an AI-powered CV builder with seven visual moments that are hard to communicate without running the dev stack: PDF import, application preparation, cover-letter PDF export, MCP API key setup, passwordless login, registration, and editor export. The existing `showcase.gif` is a hand-dropped asset with no reproducible generation path.

The goal is to produce reproducible MP4 recordings of each feature by driving a headless Chromium against the live dev stack, then wire those recordings into the landing page hero (replacing the CSS-only SVG animation from `add-landing-page`), a new `/features` page, and the README showcase.

## Goals / Non-Goals

**Goals:**

- Generate reproducible MP4 recordings for seven features plus a showcase montage using Puppeteer 25.1.0's `page.screenshot()` at 30 fps, assembled with `ffmpeg`.
- Produce a `scripts/recordings/record-features.mjs` CLI that works with `pnpm dev` running locally, requires no new API endpoint, and requires no CI infrastructure.
- Wire recordings into three consumers: landing page hero (`hero.tsx`), `/features` page, and README showcase.
- Add `?hide-dev-banner=1` support so the Mailpit dev banner can be suppressed in recordings.
- Make recordings gitignored; a `pnpm recordings` run is required after a fresh clone.
- Declare the deployment gate: the landing page MUST NOT be deployed if the recording is older than the most recent hero-adjacent component change.

**Non-Goals:**

- No API endpoint for recording generation. This is a developer-only CLI tool.
- No CI job that generates recordings. The developer runs the CLI locally.
- No Playwright migration. Puppeteer's `startScreencast` is experimental and unsupported in `chromium-headless-shell`; the 30 fps `page.screenshot()` loop is sufficient for marketing video quality.
- No GIF output in the first cut. The user selected MP4/WebM.
- No OAuth recording. GitHub/Google/LinkedIn OAuth flows require real third-party apps and network round-trips hostile to headless recording.
- No video hosting or CDN in the first cut. Recordings live in `apps/web/public/recordings/` and are served as static Next.js assets.

## Decisions

### D1. Frame-capture loop over screencast API

Puppeteer's `startScreencast` API is experimental and unsupported in `chromium-headless-shell`. The recording driver uses a 30 fps `page.screenshot()` loop instead: between each capture, `await new Promise(r => setTimeout(r, 1000/30))` holds the frame. This is the approach used by `generate-sample-pdfs.mjs` for PDF rendering and is battle-tested in this codebase.

**Alternatives considered:** `page.video` / `recordVideo` — requires Playwright, not Puppeteer. `page.startScreencast` — experimental, unsupported in headless-shell. `page.tracing.start({ screenshots: true })` — produces a `.trace.json`, not a final video format. The 30 fps screenshot loop is the most reliable option available.

### D2. `ffmpeg` as a shell-out tool, not a Node dependency

`ffmpeg` is not a Node package and cannot be installed via `npm` / `pnpm`. The script shells out to `ffmpeg` and fails with a clear "ffmpeg not found on PATH" error if it is absent. The `scripts/recordings/README.md` documents the install command for macOS (`brew install ffmpeg`) and Ubuntu (`apt-get install ffmpeg`).

**Alternatives considered:** Pure-JS H.264 encoder (no mature package supports H.264 without a native addon). WebM with `mediarecorder` in the browser (requires a different driver shape). The shell-out is the correct tradeoff for the first cut; a pure-JS fallback can be a follow-on.

### D3. Mailpit auto-code fetch for passwordless login

The `login-passwordless` screenplay must enter the 6-digit OTP code from Mailpit. Rather than pausing for a `readline` prompt, the script auto-fetches the most recent Mailpit message via `http://127.0.0.1:54324/api/v1/messages?query=to:<developer-email>` and parses the 6-digit code with a regex. If Mailpit is unreachable (e.g. in cloud Supabase mode), the script falls back to `readline`.

**Alternatives considered:** `readline` prompt always — more reliable but requires manual intervention for every recording run. The auto-fetch is the right default; `readline` fallback handles the edge case.

### D4. `Executor` class as the screenplay abstraction

Screenplays are functions that take a Puppeteer `Page` and an `Executor` instance. The `Executor` wraps common operations (`goto`, `click`, `type`, `waitFor`, `wait`, `screenshot`, `uploadFile`) and abstracts the frame-capture loop. This keeps individual screenplays focused on the feature logic and separates the recording mechanics from the page-driving logic.

**Alternatives considered:** Screenplays as standalone async functions that manage their own `page.screenshot()` calls — would duplicate the capture logic in every screenplay. The `Executor` is a thin facade that enables this separation cleanly.

### D5. Screenplay sequencing and dependencies

Screenplays are independent except for `cover-letter-pdf`, which requires an application ID from `application-prepare`. The CLI supports `--only=<id>` so each screenplay can be run individually. The showcase montage (`showcase.ts`) is a separate screenplay that runs the three most distinctive drivers back-to-back into a single MP4.

**Alternatives considered:** Running all screenplays in a single long-lived browser session — rejected because page state (sessionStorage, auth cookies) persists and would interfere with later screenplays. Each screenplay gets a fresh browser context.

### D6. `apps/web/public/recordings/` as the output directory

Recordings are placed in `apps/web/public/recordings/` so Next.js serves them as static assets at `/recordings/<id>.mp4`. No `next.config.ts` changes, no new routes, no build pipeline changes.

**Alternatives considered:** Supabase Storage bucket — requires a new bucket, new env var, and a migration path for the recordings URL. A local directory committed to git — rejected (large binary artifacts). A CDN origin — premature for the first cut.

### D7. `?hide-dev-banner=1` query param in auth pages

The `DevMailpitHint` banner appears on `/login`, `/register`, and `/auth/check-email` when `NEXT_PUBLIC_SUPABASE_URL` is `localhost` or `127.0.0.1`. The recording driver adds `?hide-dev-banner=1` to these URLs, and `apps/web/src/lib/auth/dev-mailpit.ts` checks for this parameter and suppresses the banner.

**Alternatives considered:** Recording against a cloud Supabase setup (`pnpm setup:env:prod`) — heavier, requires a real Supabase project. The query-param approach is three lines of code and does not affect production behavior.

### D8. `showcase.mp4` as the landing page hero recording

The landing page hero plays `showcase.mp4` (the 15-second montage of the three most distinctive features). For `prefers-reduced-motion: reduce`, a static poster PNG is shown instead. This is implemented as a plain `<video>` element in `hero.tsx` — no client JS required, no animation library.

**Alternatives considered:** Using `pdf-import.mp4` directly as the hero — the showcase montage shows more breadth. The montage is the right choice for the README analog; the single strongest demo (PDF import) could also be used as a variant in the `/features` page.

## Risks / Trade-offs

- **ffmpeg not on PATH** — the script fails with a clear error. Mitigated by the README prerequisite documentation.
- **AI agent required for clips 1-3** — without an active account in `/dashboard/settings/ai-agent`, those screenplays fail. The README documents the BYOK setup step. The script could probe the API and skip gracefully, but the user wants a full recording of all seven features.
- **Recordings drift from UI** — the spec asserts that recordings MUST be regenerated when hero-adjacent components change. This is an enforcement constraint, not a technical guard. Developers must remember to run `pnpm recordings` after significant UI changes.
- **30 fps screenshot fidelity** — acceptable for 1280x720 marketing video but not sub-frame accurate. A Playwright migration (out of scope) would unlock `recordVideo()` for higher fidelity.
- **The dev stack must be running** — unlike `pnpm samples:pdf` which is a one-shot `setContent` call, these recordings need `pnpm dev` live. The script asserts `http://localhost:3000` is reachable before starting.
- **Gitignored recordings** — a fresh clone has no recordings. The landing page consumer will render a broken video element until `pnpm recordings` is run. This is documented as a post-clone setup step in `scripts/recordings/README.md`.

## Migration Plan

1. Land the change. Recordings do not exist yet — `apps/web/public/recordings/` is empty (`.gitkeep` only).
2. Developer runs `pnpm dev` (web + api), `pnpm samples:seed`, and — for AI-agent clips — configures an active account in `/dashboard/settings/ai-agent`.
3. Developer runs `pnpm recordings`. Eight MP4 files appear in `apps/web/public/recordings/`.
4. Landing page hero now plays `showcase.mp4` (or shows the poster if `prefers-reduced-motion`).
5. `/features` page renders eight video embeds.
6. README shows the `<video>` element pointing to `showcase.mp4`.
7. Roll back by reverting the commit if any consumer is broken.

## Open Questions

- **Showcase composition** (answered in the user's selections): the showcase montage is clips 1+2+7 with crossfades; the landing page hero uses the showcase clip directly.
- **Recording storage** (answered): recordings live in `apps/web/public/recordings/` served as static Next.js assets. Supabase Storage is documented as a follow-on.
- **AI-agent key source** (answered): the developer configures the active account in `/dashboard/settings/ai-agent` before running `pnpm recordings`. The script does not configure the account automatically.
