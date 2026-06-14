# Feature Recordings

Generate MP4 screen recordings of the Resubuild product by driving a headless Chromium against the live dev stack.

## Prerequisites

1. **Dev stack running**

   ```bash
   pnpm dev   # starts web (:3000) + api (:3001) + supabase
   ```

2. **Seed data**

   ```bash
   pnpm samples:seed   # creates developer@resubuild.local + 10 sample CVs
   ```

3. **ffmpeg** on `PATH`

   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu / WSL
   sudo apt-get install ffmpeg
   ```

   Verify:

   ```bash
   ffmpeg -version
   ```

4. **AI agent configured** (required for `pdf-import`, `application-prepare`, `cover-letter-pdf`)
   - Open `http://localhost:3000/dashboard/settings/ai-agent`
   - Add a real API key for your LLM provider
   - Without this, those three clips will fail at the AI processing step

## Usage

```bash
# Generate all 8 recordings (takes ~3-5 minutes)
pnpm recordings

# Generate a single recording
pnpm recordings --only=pdf-import

# Override FPS or output directory
pnpm recordings --fps=30 --out=./my-recordings/
```

## Output

Recordings are written to `apps/web/public/recordings/`:

```
apps/web/public/recordings/
├── pdf-import.mp4        # PDF import flow
├── application-prepare.mp4  # Application preparation workspace
├── cover-letter-pdf.mp4  # Cover letter PDF export
├── mcp-key.mp4           # MCP API key creation
├── login-passwordless.mp4 # Passwordless login (OTP)
├── register.mp4          # Registration flow
├── editor-export.mp4     # Editor preview + PDF download
├── showcase.mp4          # 15s montage (pdf-import + app-prepare + editor-export)
└── [corresponding .png poster files]
```

These files are **gitignored**. Run `pnpm recordings` after a fresh clone.

## Screenplays

| ID                    | Feature                                                   | Prereq              |
| --------------------- | --------------------------------------------------------- | ------------------- |
| `pdf-import`          | Upload a PDF, AI extracts resume data                     | AI agent            |
| `application-prepare` | Tailor a CV to a job description                          | AI agent            |
| `cover-letter-pdf`    | Export a cover letter as PDF                              | application-prepare |
| `mcp-key`             | Create and copy an MCP API key                            | none                |
| `login-passwordless`  | Log in with email OTP code                                | Mailpit running     |
| `register`            | Create a new account                                      | none                |
| `editor-export`       | Edit and download a CV as PDF                             | seeded CV           |
| `showcase`            | Montage: pdf-import → application-prepare → editor-export | AI agent            |

## Re-recording

Run `pnpm recordings` whenever:

- Any UI component in the hero, dashboard, editor, import flow, or auth pages changes
- A new feature is added that the recordings should capture
- The recordings are older than the most recent `main` commit that touched those areas

## Troubleshooting

**"ffmpeg not found on PATH"**

Install ffmpeg first (see Prerequisites above).

**"Next.js dev server not reachable at http://localhost:3000"**

Start the dev stack: `pnpm dev`. Wait for the `ready` message before running recordings.

**"No local credentials"**

Run `pnpm samples:seed` first. This creates `developer@resubuild.local`.

**`pdf-import` hangs at the progress bar**

The AI import requires an active AI agent key in `/dashboard/settings/ai-agent`. Open the page and add a real API key.

**`login-passwordless` fails to fetch OTP from Mailpit**

If Mailpit is not reachable (e.g. running against cloud Supabase), the script falls back to a manual prompt. Alternatively, run `pnpm recordings` against the local Supabase stack only.

**`cover-letter-pdf` requires application-prepare to have run first**

The two screenplays must run in the same CLI invocation so they share the same browser session. Use `pnpm recordings` (which runs them in order) rather than `--only=cover-letter-pdf`.

## Architecture

- **Driver**: `record-features.mjs` — CLI entrypoint
- **Executor**: `executor.ts` — Puppeteer wrapper with frame-capture loop
- **Screenplays**: `screenplays.ts` — one function per feature recording
- **ffmpeg**: shells out to `ffmpeg` for H.264 encoding and poster extraction
- **Output**: `apps/web/public/recordings/` — served as static assets at `/recordings/<id>.mp4`

## Modifying Screenplays

To adjust timing, interaction steps, or selectors:

1. Edit `scripts/recordings/screenplays.ts`
2. Run `pnpm recordings --only=<id>` to test just that clip
3. Use `--fps=1` to slow down capture for debugging (each frame is held longer)
