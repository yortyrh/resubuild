# feature-recordings Specification

## Purpose

Define the dev-time recording generation system for Resubuild: a CLI driver that produces reproducible MP4 screen recordings of the product's marquee features by driving a headless Chromium against the live dev stack, and the contract for wiring those recordings into the landing page hero, the `/features` page, and the README showcase.

## Requirements

### Requirement: The CLI driver SHALL produce MP4 recordings for all seven features plus a showcase montage

The `scripts/recordings/record-features.mjs` CLI, run from the repo root, SHALL produce eight MP4 files:

- `pdf-import.mp4` + `pdf-import.png` (poster): the PDF import flow from `/dashboard/cv/new/import/file` through preview and save.
- `application-prepare.mp4` + `application-prepare.png`: the application preparation flow from `/dashboard/applications/new` through the workspace with the tailored CV tab.
- `cover-letter-pdf.mp4` + `cover-letter-pdf.png`: the cover-letter PDF export from the application workspace.
- `mcp-key.mp4` + `mcp-key.png`: the MCP API key creation and client configuration display at `/dashboard/settings/mcp`.
- `login-passwordless.mp4` + `login-passwordless.png`: the passwordless login flow at `/login` with the Email code tab, fetching the OTP from Mailpit automatically.
- `register.mp4` + `register.png`: the registration flow at `/register` through auto-login or the check-email page.
- `editor-export.mp4` + `editor-export.png`: the editor preview and PDF download from `/dashboard/cv/[id]`.
- `showcase.mp4` + `showcase.png`: a 15-second montage of the three most distinctive clips (pdf-import + application-prepare + editor-export) assembled with `ffmpeg`.

All files SHALL be placed in `apps/web/public/recordings/` and SHALL be named exactly as specified. All MP4 files SHALL use H.264 video (`-c:v libx264`) at 1280x720 resolution, 30 fps, and `yuv420p` pixel format. Poster PNG files SHALL be the first frame of the recording.

#### Scenario: CLI produces all eight recordings

- **WHEN** the developer runs `pnpm recordings` with the dev stack running, seed data present, and ffmpeg on PATH
- **THEN** the CLI SHALL produce `pdf-import.mp4`, `application-prepare.mp4`, `cover-letter-pdf.mp4`, `mcp-key.mp4`, `login-passwordless.mp4`, `register.mp4`, `editor-export.mp4`, and `showcase.mp4` in `apps/web/public/recordings/`
- **AND** SHALL produce corresponding `.png` poster files for each
- **AND** SHALL log a summary to stderr listing each clip's duration and output path

#### Scenario: CLI fails gracefully when ffmpeg is not available

- **WHEN** the developer runs `pnpm recordings` without ffmpeg on PATH
- **THEN** the CLI SHALL exit with code 1 and print a clear error: "ffmpeg not found on PATH. Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Ubuntu)."

#### Scenario: CLI fails gracefully when the dev server is not running

- **WHEN** `http://localhost:3000` is unreachable
- **THEN** the CLI SHALL exit with code 1 and print: "Next.js dev server not reachable at http://localhost:3000. Run 'pnpm dev' first."

### Requirement: The CLI SHALL support running a single screenplay

The CLI SHALL accept a `--only=<id>` argument that runs exactly one screenplay and produces exactly one MP4 file plus its poster.

#### Scenario: Running a single screenplay

- **WHEN** the developer runs `pnpm recordings --only=pdf-import`
- **THEN** the CLI SHALL produce only `pdf-import.mp4` and `pdf-import.png` in the output directory
- **AND** SHALL exit without running any other screenplay

#### Scenario: --only with an unknown id

- **WHEN** the developer runs `pnpm recordings --only=does-not-exist`
- **THEN** the CLI SHALL exit with code 1 and print: "Unknown screenplay 'does-not-exist'. Available: pdf-import, application-prepare, cover-letter-pdf, mcp-key, login-passwordless, register, editor-export, showcase."

### Requirement: The landing page hero SHALL render a real recording with a reduced-motion fallback

The landing page hero in `apps/web/src/components/landing/hero.tsx` SHALL render a `<video>` element pointing to `/recordings/showcase.mp4` with `autoplay muted loop playsinline`. For `prefers-reduced-motion: reduce`, the component SHALL render only the poster image (`/recordings/showcase.png`) without a video element.

#### Scenario: Reduced motion preference

- **WHEN** the user's operating system has `prefers-reduced-motion: reduce` set
- **THEN** the landing page hero SHALL render an `<img>` element with `src="/recordings/showcase.png"` and `alt="Resubuild demo"`, not a `<video>`
- **AND** SHALL NOT render any `<video>` element

#### Scenario: Video playback

- **WHEN** the user loads the landing page without reduced-motion preference
- **THEN** the hero SHALL render `<video src="/recordings/showcase.mp4" autoplay muted loop playsinline poster="/recordings/showcase.png" />`
- **AND** the video SHALL begin playing automatically

### Requirement: The /features page SHALL embed one recording per feature

The `/features` page at `apps/web/app/features/page.tsx` SHALL render one `<FeatureRecording>` component per feature with the feature's id, title, and caption. The `<FeatureRecording>` component SHALL render a `<video>` with the same attributes as the landing page hero.

#### Scenario: Features page renders all seven feature recordings

- **WHEN** the user navigates to `/features`
- **THEN** the page SHALL render seven `<video>` elements, one for each feature recording
- **AND** each SHALL have `autoplay muted loop playsinline` and a `poster` pointing to the feature's PNG

### Requirement: The README showcase SHALL use the new video

The README SHALL replace the `showcase.gif` markdown image with an HTML `<video>` element pointing to `/recordings/showcase.mp4`, and SHALL add a "See all features" link to `/features`.

#### Scenario: README uses video element

- **WHEN** a visitor views the README on GitHub or the deployed marketing site
- **THEN** the showcase section SHALL display `<video controls autoplay muted loop playsinline src="/recordings/showcase.mp4" style="max-width:100%;border-radius:0.75rem;" />`
- **AND** SHALL include a "See all features" link pointing to `/features`

### Requirement: The hide-dev-banner query parameter SHALL suppress the Mailpit banner in recordings

The `apps/web/src/lib/auth/dev-mailpit.ts` file SHALL check for `?hide-dev-banner=1` in the URL and, when present, SHALL suppress the `DevMailpitHint` banner regardless of the `NEXT_PUBLIC_SUPABASE_URL` value.

#### Scenario: hide-dev-banner suppresses the banner

- **WHEN** the user navigates to `/login?hide-dev-banner=1` or `/register?hide-dev-banner=1`
- **THEN** the `DevMailpitHint` banner SHALL NOT be rendered
- **AND** the page SHALL render identically to the production behavior (no dashed "Development" border)

### Requirement: All recordings SHALL be gitignored

The `apps/web/public/recordings/` directory SHALL contain a `.gitignore` that ignores all `*.mp4` and `*.png` files. The directory itself SHALL be tracked in git; only the recording artifacts SHALL be excluded.

#### Scenario: Recordings are not committed

- **WHEN** a developer runs `git status` after `pnpm recordings`
- **THEN** the output SHALL show the new MP4 and PNG files as untracked or ignored
- **AND** `git add .` SHALL NOT stage any recording file
