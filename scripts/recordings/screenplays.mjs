/**
 * Screenplay catalog for feature recordings (pure JS, .mjs).
 *
 * Each export is an async function:
 *   async (exec, opts) => Promise<void>
 *
 * Screenplays drive the live dev stack via the Executor API:
 *   exec.startScreenplay(id)      — begin capture, create temp dir
 *   exec.startCapture()            — start 30fps frame capture loop
 *   exec.goto('/path')            — navigate
 *   exec.click('.btn')            — click
 *   exec.fillReact('textarea', text) — fill React-controlled input
 *   exec.type('input', text)      — type into a normal input
 *   exec.uploadFile('input[type=file]', path) — upload a file
 *   exec.wait(ms)                 — pause
 *   exec.waitFor('.selector')     — wait for element
 *   exec.capture()                — capture one extra frame
 *   exec.stopCapture()            — stop capture loop
 *   exec.assembleMp4(out)         — run ffmpeg
 *   exec.generatePoster(mp4, png)  — extract first frame as poster
 *   exec.cleanupTempDir()         — remove temp PNGs
 *
 * All paths are relative to the Next.js baseUrl (http://localhost:3000).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalCredentials } from '../lib/local-credentials.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/** @type {ScreenplayOpts} */
const DEFAULT_OPTS = {
  pdfSamplesDir: path.join(ROOT, '.samples/resumes/pdf'),
  jsonresumeSamplesDir: path.join(ROOT, '.samples/resumes/jsonresume'),
  applicationId: undefined,
};

/** Canned job description for the application-prepare screenplay */
const CANNED_JOB_DESCRIPTION = `
We are looking for a Senior Full-Stack Engineer to join our Platform team.

Requirements:
- 5+ years of experience with TypeScript and React
- Experience with Node.js, PostgreSQL, and REST APIs
- Familiarity with cloud platforms (AWS, GCP, or Azure)
- Strong communication skills

Nice to have:
- Experience with Next.js or NestJS
- Knowledge of CI/CD pipelines
- Open source Contributions
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Log in as the developer user.
 * @param {Executor} exec
 */
async function loginDev(exec) {
  const creds = await loadLocalCredentials();
  if (!creds) throw new Error('No local credentials. Run: pnpm samples:seed');
  const { email, password } = creds.developerUser;

  await exec.goto('/login');
  await exec.waitFor('input[type="email"], input[name="email"]');
  await exec.type('input[type="email"], input[name="email"]', email);
  await exec.type('input[type="password"]', password);
  await exec.click('button[type="submit"]');
  await exec.waitForUrl('/dashboard', 15_000);
}

/**
 * Auto-fetch the most recent OTP code from Mailpit for a given email.
 * Falls back to readline if Mailpit is unreachable.
 * @param {string} email
 * @returns {Promise<string>}
 */
async function fetchMailpitOtp(email) {
  const mailpitUrl = 'http://127.0.0.1:54324';

  try {
    const { default: got } = await import('got');
    const messages = await got(
      `${mailpitUrl}/api/v1/messages?query=${encodeURIComponent(`to:${email}`)}`,
      { timeout: 5_000 },
    ).json();

    if (!messages.messages?.length) throw new Error('No Mailpit messages');

    const latestId = messages.messages[0].id;
    const message = await got(`${mailpitUrl}/api/v1/messages/${latestId}`, {
      timeout: 5_000,
    }).json();

    const body = message.Body ?? message.Html ?? '';
    const match = body.match(/\b\d{6}\b/);
    if (!match) throw new Error('No OTP code found in Mailpit message');
    return match[0];
  } catch {
    const { createInterface } = await import('readline');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(
        `\nMailpit unreachable — paste the 6-digit code sent to ${email}:\n> `,
        (code) => {
          rl.close();
          resolve(code.trim());
        },
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Screenplays
// ---------------------------------------------------------------------------

/**
 * pdf-import: Upload a PDF, wait for AI import, save to editor.
 * Prereq: AI agent configured at /dashboard/settings/ai-agent
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function pdfImport(exec, opts) {
  await loginDev(exec);
  await exec.startCapture();

  await exec.goto('/dashboard/cv/new/import/file');
  await exec.waitFor('input[type="file"]');

  const pdfPath = path.join(opts.pdfSamplesDir, 'Alex Mercer - Growth Marketing Manager.pdf');
  await exec.uploadFile('input[type="file"]', pdfPath);

  // Wait for the "Save" button in the preview dialog
  await exec.waitFor('button:has-text("Save")', 90_000);

  await exec.stopCapture();
}

/**
 * application-prepare: Paste a job description, click Prepare, show tailored CV tab.
 * Prereq: AI agent configured
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function applicationPrepare(exec, opts) {
  await loginDev(exec);
  await exec.startCapture();

  await exec.goto('/dashboard/applications/new');
  await exec.waitFor('text=Prepare application');

  // Text source tab is default — paste job description into first textarea
  const textarea =
    'textarea[data-testid="job-description-textarea"], textarea[name="description"], textarea';
  await exec.waitFor(textarea, 5_000);
  await exec.fillReact(textarea, CANNED_JOB_DESCRIPTION);

  await exec.click('button:has-text("Prepare application")');

  // Wait for workspace URL
  await exec.waitForUrl('/dashboard/applications/', 90_000);
  await exec.waitFor('[data-testid="workspace-tabs"]', 5_000);

  // Show the tailored CV tab
  await exec.click('[data-testid="tab-tailored-cv"]');
  await exec.waitFor('text=Tailored CV', 3_000);

  await exec.stopCapture();
}

/**
 * cover-letter-pdf: Open existing application, switch to cover letter tab, click PDF.
 * Prereq: applicationPrepare must have run first (shares the app URL)
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function coverLetterPdf(exec, opts) {
  if (!opts.applicationId) {
    throw new Error('cover-letter-pdf requires applicationId from application-prepare');
  }

  await loginDev(exec);
  await exec.startCapture();

  await exec.goto(`/dashboard/applications/${opts.applicationId}`);
  await exec.waitFor('[data-testid="workspace-tabs"]', 10_000);

  await exec.click('[data-testid="tab-cover-letter"]');
  await exec.waitFor('.cover-letter-editor, [data-testid="cover-letter"]', 5_000);

  await exec.click('button:has-text("PDF")');
  await exec.waitFor('text=Downloading, text=Preparing', 5_000);

  await exec.stopCapture();
}

/**
 * mcp-key: Navigate to MCP settings, create API key, show copy button and config block.
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function mcpKey(exec, opts) {
  await loginDev(exec);
  await exec.startCapture();

  await exec.goto('/dashboard/settings/mcp');
  await exec.waitFor('text=MCP access', 10_000);

  // Create API key
  await exec.click('button:has-text("Create API key")');

  // Wait for the secret banner
  await exec.waitFor('text=Copy your new API key', 5_000);
  await exec.waitFor('[data-testid="mcp-client-config"]', 3_000);

  await exec.stopCapture();
}

/**
 * login-passwordless: Navigate to /login, use Email code tab, fetch OTP from Mailpit.
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function loginPasswordless(exec, opts) {
  const creds = await loadLocalCredentials();
  if (!creds) throw new Error('No local credentials. Run: pnpm samples:seed');
  const { email } = creds.developerUser;

  await exec.startCapture();

  await exec.goto('/login?hide-dev-banner=1');
  await exec.waitFor('[data-testid="tab-email-code"], button:has-text("Email code")', 5_000);

  // Switch to Email code tab
  await exec.click('[data-testid="tab-email-code"], button:has-text("Email code")');
  await exec.waitFor('input[type="email"], input[name="email"]');

  await exec.type('input[type="email"], input[name="email"]', email);
  await exec.click('button:has-text("Send code")');

  // Wait for the code input
  await exec.waitFor('input[maxlength="6"], input[placeholder*="code"]', 10_000);

  // Auto-fetch OTP from Mailpit
  const code = await fetchMailpitOtp(email);
  await exec.type('input[maxlength="6"], input[placeholder*="code"]', code);

  await exec.click('button:has-text("Verify code")');

  // Should land on dashboard
  await exec.waitForUrl('/dashboard', 15_000);

  await exec.stopCapture();
}

/**
 * register: Navigate to /register, fill form, click Register.
 * Handles both auto-login (enable_confirmations=false) and check-email (confirmations=true).
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function register(exec, opts) {
  await exec.startCapture();

  const uniqueEmail = `recording-${Date.now()}@resubuild.local`;
  const password = 'RecordingTest123!';

  await exec.goto('/register?hide-dev-banner=1');
  await exec.waitFor('input[type="email"], input[name="email"]', 5_000);

  await exec.type('input[type="email"], input[name="email"]', uniqueEmail);
  await exec.type('input[type="password"]', password);

  await exec.click('button[type="submit"]');

  try {
    await exec.waitForUrl('/dashboard', 10_000);
  } catch {
    await exec.waitForUrl('/auth/check-email', 10_000);
  }

  await exec.stopCapture();
}

/**
 * editor-export: Log in, click first CV card, open preview, trigger PDF download.
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function editorExport(exec, opts) {
  await loginDev(exec);
  await exec.startCapture();

  await exec.goto('/dashboard');
  await exec.waitFor('[data-testid="cv-list"]', 10_000);

  // Click the first CV link
  const firstCvLink = await exec.getPage().$('[data-testid="cv-list"] a[href*="/dashboard/cv/"]');
  if (!firstCvLink) throw new Error('No CV cards found — run pnpm samples:seed first');
  await firstCvLink.click();

  await exec.waitForUrl('/dashboard/cv/', 10_000);
  await exec.waitFor('[data-testid="cv-editor"]', 5_000);

  // Open preview
  await exec.click('button:has-text("Preview"), button:has-text("preview")');
  await exec.waitFor('iframe', 5_000);

  // Click Download PDF
  await exec.click('button:has-text("Download PDF"), button:has-text("PDF")');
  await exec.waitFor('text=Preparing', 3_000);

  await exec.stopCapture();
}

/**
 * showcase: Back-to-back segments of pdf-import + application-prepare + editor-export.
 * Uses loginDev once and reuses the session across segments.
 * @param {Executor} exec
 * @param {ScreenplayOpts} opts
 */
async function showcase(exec, opts) {
  // Segment 1: pdf-import
  await loginDev(exec);
  await exec.startCapture();
  await exec.goto('/dashboard/cv/new/import/file');
  await exec.waitFor('input[type="file"]');
  const pdfPath = path.join(opts.pdfSamplesDir, 'Alex Mercer - Growth Marketing Manager.pdf');
  await exec.uploadFile('input[type="file"]', pdfPath);
  await exec.waitFor('button:has-text("Save")', 90_000);
  await exec.stopCapture();

  // Segment 2: application-prepare (reuse session)
  await exec.goto('/dashboard/applications/new');
  await exec.waitFor('text=Prepare application');
  const textarea = 'textarea';
  await exec.fillReact(textarea, CANNED_JOB_DESCRIPTION);
  await exec.click('button:has-text("Prepare application")');
  await exec.waitForUrl('/dashboard/applications/', 90_000);
  await exec.stopCapture();

  // Segment 3: editor-export (reuse session)
  await exec.goto('/dashboard');
  await exec.waitFor('[data-testid="cv-list"]');
  const firstCvLink = await exec.getPage().$('[data-testid="cv-list"] a[href*="/dashboard/cv/"]');
  if (firstCvLink) await firstCvLink.click();
  await exec.waitForUrl('/dashboard/cv/', 10_000);
  await exec.waitFor('[data-testid="cv-editor"]');
  await exec.click('button:has-text("Preview"), button:has-text("preview")');
  await exec.waitFor('iframe');
  await exec.stopCapture();
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const SCREENPLAYS = {
  'pdf-import': pdfImport,
  'application-prepare': applicationPrepare,
  'cover-letter-pdf': coverLetterPdf,
  'mcp-key': mcpKey,
  'login-passwordless': loginPasswordless,
  register: register,
  'editor-export': editorExport,
  showcase: showcase,
};

export const SCREENPLAY_IDS = Object.keys(SCREENPLAYS);
