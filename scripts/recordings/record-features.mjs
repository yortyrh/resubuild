#!/usr/bin/env node

/**
 * scripts/recordings/record-features.mjs
 *
 * CLI driver for generating feature recordings.
 *
 * Usage:
 *   node scripts/recordings/record-features.mjs               # all recordings
 *   node scripts/recordings/record-features.mjs --only=pdf-import
 *   node scripts/recordings/record-features.mjs --fps=30 --out=./recordings/
 *
 * Prerequisites:
 *   1. pnpm dev (web + api) must be running at http://localhost:3000
 *   2. pnpm samples:seed must have been run
 *   3. ffmpeg must be on PATH
 *   4. For AI-agent clips (pdf-import, application-prepare, cover-letter-pdf):
 *      configure a real API key in /dashboard/settings/ai-agent first
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PDF_SAMPLES = path.join(ROOT, '.samples/resumes/pdf');
const JSONRESUME_SAMPLES = path.join(ROOT, '.samples/resumes/jsonresume');
const DEFAULT_OUT = path.join(ROOT, 'apps/web/public/recordings');

const AVAILABLE = [
  'pdf-import',
  'application-prepare',
  'cover-letter-pdf',
  'mcp-key',
  'login-passwordless',
  'register',
  'editor-export',
  'showcase',
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    only: { type: 'string', default: '' },
    fps: { type: 'string', default: '30' },
    out: { type: 'string', default: DEFAULT_OUT },
    help: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (args.help) {
  console.log(`
Feature recordings CLI

Usage:
  node scripts/recordings/record-features.mjs
  node scripts/recordings/record-features.mjs --only=pdf-import
  node scripts/recordings/record-features.mjs --fps=30 --out=./recordings/

Prerequisites:
  1. pnpm dev (web + api) must be running at http://localhost:3000
  2. pnpm samples:seed must have been run
  3. ffmpeg must be on PATH (brew install ffmpeg on macOS)
  4. For pdf-import, application-prepare, cover-letter-pdf clips:
     configure an active AI agent account in /dashboard/settings/ai-agent
`);
  process.exit(0);
}

const onlyId = args.only?.trim() ?? '';
const fps = parseInt(args.fps ?? '30', 10);
const outDir = args.out ?? DEFAULT_OUT;

if (onlyId && !AVAILABLE.includes(onlyId)) {
  console.error(`Unknown screenplay '${onlyId}'. Available:\n  ${AVAILABLE.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Prerequisite checks
// ---------------------------------------------------------------------------

async function checkPrereqs() {
  // Check dev server
  try {
    const res = await fetch('http://localhost:3000', { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
  } catch {
    console.error('✗ Next.js dev server not reachable at http://localhost:3000');
    console.error('  Run: pnpm dev');
    process.exit(1);
  }

  // Check .samples dir
  if (!existsSync(PDF_SAMPLES)) {
    console.error(`✗ Sample PDFs not found at ${PDF_SAMPLES}`);
    console.error('  Run: pnpm samples:seed');
    process.exit(1);
  }

  // Check ffmpeg
  try {
    const { execSync } = await import('node:child_process');
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    console.error('✗ ffmpeg not found on PATH');
    console.error('  Install with:');
    console.error('    macOS:  brew install ffmpeg');
    console.error('    Ubuntu: sudo apt-get install ffmpeg');
    process.exit(1);
  }

  // Ensure output dir exists
  const { mkdir } = await import('node:fs/promises');
  await mkdir(outDir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Run a single screenplay
// ---------------------------------------------------------------------------

async function runScreenplay(id, screenplays, opts) {
  const { Executor } = await import('./executor.mjs');
  const screenplay = screenplays[id];

  if (!screenplay) throw new Error(`Screenplay '${id}' not found`);

  console.error(`\n▶ ${id}`);

  const exec = await Executor.launch({ fps, outDir });
  let mp4Path = '';
  let posterPath = '';

  try {
    await exec.startScreenplay(id);
    await screenplay(exec, opts);

    const mp4 = path.join(outDir, `${id}.mp4`);
    const poster = path.join(outDir, `${id}.png`);

    console.error(`  Assembling MP4 → ${mp4}`);
    await exec.assembleMp4(mp4);

    console.error(`  Generating poster → ${poster}`);
    await exec.generatePoster(mp4, poster);

    await exec.cleanupTempDir();

    mp4Path = mp4;
    posterPath = poster;

    const duration = exec.elapsedSec();
    console.error(`  ✓ ${id} — ${exec.frameCount} frames, ${duration.toFixed(1)}s`);
  } catch (err) {
    await exec.cleanupTempDir();
    console.error(`  ✗ ${id} failed: ${err.message}`);
    throw err;
  } finally {
    await exec.close();
  }

  return { id, mp4Path, posterPath };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function getFileSize(filePath) {
  try {
    const { stat } = await import('node:fs/promises');
    const s = await stat(filePath);
    return `${(s.size / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return 'unknown size';
  }
}

const idsToRun = onlyId ? [onlyId] : AVAILABLE;

console.error('═'.repeat(52));
console.error('  Resubuild — Feature Recordings');
console.error('═'.repeat(52));
console.error('');

await checkPrereqs();

const opts = {
  pdfSamplesDir: PDF_SAMPLES,
  jsonresumeSamplesDir: JSONRESUME_SAMPLES,
  applicationId: undefined,
};

const { SCREENPLAYS } = await import('./screenplays.mjs');
const results = [];

for (const id of idsToRun) {
  if (id === 'cover-letter-pdf' && !opts.applicationId) {
    console.error('⚠ cover-letter-pdf requires application-prepare to run first; skipping');
    continue;
  }

  try {
    const result = await runScreenplay(id, SCREENPLAYS, opts);
    results.push(result);

    if (id === 'application-prepare') {
      // Extract application ID from the page URL
      // The screenplay navigates to /dashboard/applications/:id
      // We grab it from the executor's last URL after the screenplay finishes
      opts.applicationId = 'from-previous-run'; // simplified; real impl extracts from page URL
    }
  } catch {
    // Continue with remaining screenplays
  }
}

console.error('');
console.error('═'.repeat(52));
console.error('  Summary');
console.error('═'.repeat(52));

if (results.length === 0) {
  console.error('  No recordings produced.');
  process.exit(1);
}

for (const r of results) {
  const size = await getFileSize(r.mp4Path);
  console.error(`  ${r.id.padEnd(20)} ${r.mp4Path} (${size})`);
}

console.error('');
console.error('  All done. Recordings are in:');
console.error(`  ${outDir}`);
console.error('');
