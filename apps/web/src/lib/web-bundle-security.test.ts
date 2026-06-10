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

function walkAll(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walkAll(full, acc);
    } else {
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
 * Static-analysis guard mirroring the `web-application` spec scenario
 * "Client bundle has Supabase client but no DB-direct symbols".
 *
 * It walks every source file that the web app would ship to the browser
 * and asserts that nothing references server-only symbols. If a future
 * refactor accidentally re-introduces the service-role key or a deep
 * import into `apps/api/src/cv/**` (or the spec-named `database-cv-rls`
 * capability), this test fails fast and points at the offending file.
 *
 * Note: a literal scan of the compiled `.next` bundle would be more
 * authoritative, but a build artifact is not always present in CI. The
 * source-level guard catches the most common regression class (an
 * accidental import in a `'use client'` module) and is fast enough to
 * run on every `pnpm test`.
 */
describe('web bundle security invariants (source-level)', () => {
  it('includes the expected source files in the scan', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(50);
    const relativePaths = SOURCE_FILES.map((f) => f.path);
    expect(relativePaths).toEqual(relativePaths.toSorted());
    expect(relativePaths).not.toContain(SELF_PATH);
  });

  it('does not reference the Supabase service-role key in any web source file', () => {
    const offenders = SOURCE_FILES.filter(
      (file) =>
        /SUPABASE_SERVICE_ROLE_KEY/.test(file.content) ||
        // `service_role` is the JSON role Supabase uses; the literal
        // string must not appear in any web source file.
        /service_role/.test(file.content),
    );

    expect(
      offenders.map((f) => f.path),
      'service-role key references in web source',
    ).toEqual([]);
  });

  it('does not expose a NEXT_PUBLIC_ prefix on the service-role key', () => {
    // Belt-and-braces: a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` would
    // be a disaster. Scan for the dangerous prefix pairing.
    const offenders = SOURCE_FILES.filter((file) =>
      /NEXT_PUBLIC_(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY)/.test(file.content),
    );

    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('does not import from the server-only api code-paths (cv or database symbols)', () => {
    // These are the symbols the OpenSpec `cv-rest-api` and
    // `database-cv-rls` specs say MUST stay server-side. The web bundle
    // is forbidden from importing them; instead the web goes through
    // the HTTP surface in `apps/web/src/lib/api.ts`.
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

    const offenders = SOURCE_FILES.flatMap((file) => {
      const matches = bannedImportPatterns
        .filter(({ pattern }) => pattern.test(file.content))
        .map(({ label }) => `${file.path} (${label})`);
      return matches;
    });

    expect(offenders, 'api code-path imports in web source').toEqual([]);
  });

  it('keeps the Supabase browser client scoped to auth flows only', () => {
    // The `@supabase/supabase-js` import is permitted only in:
    //   - apps/web/src/lib/supabase/**
    //   - apps/web/src/lib/queries/auth-*
    // Every other location must go through the API layer (see
    // biome.jsonc `noRestrictedImports` rule in `apps/web/src/lib/cv-*`
    // and `apps/web/src/components/cv/*`).
    const allowed =
      /^src\/(lib\/supabase\/|lib\/queries\/auth-|lib\/auth-session\.ts|app\/auth\/|components\/auth\/)/;
    const offenders = SOURCE_FILES.filter((file) =>
      /from\s+['"]@supabase\//.test(file.content),
    ).filter((file) => !allowed.test(file.path));

    expect(
      offenders.map((f) => f.path),
      'Supabase client imports outside auth-flow scope',
    ).toEqual([]);
  });

  it('documents the carve-out somewhere visible to operators', () => {
    // The carve-out ("only the publishable key may ship in the browser
    // bundle") MUST be documented in the OpenSpec specs (including
    // active change specs), the root README, or the web `.env.example`.
    // This survives a docs refactor because at least one of these
    // locations is the source of truth, and the test concatenates them
    // all.
    const repoRoot = join(webRoot, '..', '..');
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
    const webEnvExample = readFileSync(join(webRoot, '.env.example'), 'utf8');
    const openspecRoot = join(repoRoot, 'openspec');
    const specFiles = walkAll(openspecRoot)
      .filter((path) => path.endsWith('.md') || path.endsWith('.mdx'))
      .map((path) => readFileSync(path, 'utf8'));
    const concatenated = [readme, webEnvExample, ...specFiles].join('\n');

    // The publishable key is the ONLY Supabase key allowed in the
    // browser bundle. A passing assertion means the carve-out is
    // documented; a service-role key reference is a regression.
    expect(concatenated).toMatch(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(concatenated).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  });
});
