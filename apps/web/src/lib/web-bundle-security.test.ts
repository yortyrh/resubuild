// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(currentDir, '..', '..');
const srcRoot = join(webRoot, 'src');

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'coverage', 'dist', '.turbo']);
// This file is a static-analysis guard: it must scan every other source
// file under src/ but must not scan itself (the regexes below appear in
// the assertions themselves, which would create a self-match).
const SELF_PATH = 'src/lib/web-bundle-security.test.ts';

interface ScannedFile {
  path: string;
  content: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, acc);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

function loadSourceFiles(): ScannedFile[] {
  return walk(srcRoot)
    .map((path) => ({
      path: relative(webRoot, path).split(sep).join('/'),
      content: readFileSync(path, 'utf8'),
    }))
    .filter((file) => file.path !== SELF_PATH)
    .toSorted((a, b) => a.path.localeCompare(b.path));
}

const SOURCE_FILES = loadSourceFiles();

/**
 * Static-analysis guard (docs/requirements/nfr.md REQ-NFR-002): the web
 * bundle talks to the API over HTTP only. It must not reach the database,
 * object storage or server secrets directly.
 *
 * It walks every source file the web app would ship and asserts that nothing
 * imports server-only modules or references server-only secrets. A literal
 * scan of the compiled `.next` bundle would be more authoritative, but a build
 * artifact is not always present in CI; this source-level guard catches the
 * common regression (an accidental import in a `'use client'` module) and is
 * fast enough to run on every `pnpm test`.
 */
describe('web bundle security invariants (source-level)', () => {
  it('includes the expected source files in the scan', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(50);
    const relativePaths = SOURCE_FILES.map((f) => f.path);
    expect(relativePaths).toEqual(relativePaths.toSorted());
    expect(relativePaths).not.toContain(SELF_PATH);
  });

  it('does not reference server-only secrets', () => {
    const secretNames =
      /\b(DATABASE_URL|S3_SECRET_ACCESS_KEY|S3_ACCESS_KEY_ID|SMTP_PASSWORD|SMTP_URL|BETTER_AUTH_SECRET|MCP_KEY_PEPPER|AI_AGENT_ENCRYPTION_KEY|[A-Z]+_CLIENT_SECRET)\b/;
    const offenders = SOURCE_FILES.filter((file) => secretNames.test(file.content));

    expect(
      offenders.map((f) => f.path),
      'server-only secret references in web source',
    ).toEqual([]);
  });

  it('does not import database, storage, mail or auth-server packages', () => {
    const banned =
      /from\s+['"](@resubuild\/db|@resubuild\/email-templates|pg|drizzle-orm[^'"]*|@aws-sdk\/[^'"]+|nodemailer|better-auth(?!\/(client|react))[^'"]*|@supabase\/[^'"]+)['"]/;
    const offenders = SOURCE_FILES.filter((file) => banned.test(file.content));

    expect(
      offenders.map((f) => f.path),
      'server-only package imports in web source',
    ).toEqual([]);
  });

  it('does not import from the server-only api code-paths', () => {
    // The web goes through the HTTP surface in `apps/web/src/lib/api.ts`
    // and `apps/web/src/lib/auth/client.ts`.
    const bannedImportPatterns: { pattern: RegExp; label: string }[] = [
      { pattern: /from\s+['"]@resubuild\/api['"]/, label: '@resubuild/api' },
      {
        pattern: /from\s+['"]\.\.[/\\]\.\.[/\\]\.\.[/\\]apps[/\\]api/,
        label: 'escape into apps/api via relative path',
      },
      {
        pattern: /from\s+['"]\.\.[/\\]apps\/api/,
        label: 'one-level escape into apps/api',
      },
    ];

    const offenders = SOURCE_FILES.flatMap((file) =>
      bannedImportPatterns
        .filter(({ pattern }) => pattern.test(file.content))
        .map(({ label }) => `${file.path} (${label})`),
    );

    expect(offenders, 'api code-path imports in web source').toEqual([]);
  });
});
