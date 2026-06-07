#!/usr/bin/env node

/**
 * scripts/setup-prod-env.mjs
 *
 * Deterministic generator for the release-1 .env.prod file.
 *
 * Usage:
 *   node scripts/setup-prod-env.mjs                    # interactive prompts
 *   node scripts/setup-prod-env.mjs --dry-run          # preview to stdout
 *   node scripts/setup-prod-env.mjs --from manifest.json
 *   node scripts/setup-prod-env.mjs --from manifest.json --force
 *   node scripts/setup-prod-env.mjs --output /path/to/.env
 *   node scripts/setup-prod-env.mjs --target railway --from manifest.json
 *
 * Guards:
 *   - Refuses to overwrite a git-tracked file
 *   - Refuses to write a placeholder AI_AGENT_ENCRYPTION_KEY (unless --force)
 *   - Atomic write: write to <output>.tmp then rename
 *   - No-follow symlink on output path
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, openSync, renameSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import {
  ALLOWED_DEPLOY_TARGETS,
  applyDefaults,
  MANIFEST_SCHEMA,
  parseManifest,
  resolveTarget,
  serializeToDotenv,
  validateManifest,
} from './lib/env-prod-schema.mjs';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

/** @returns {{ from: string|null, output: string, dryRun: boolean, force: boolean, target: "docker-compose"|"railway" }} */
function parseArgs(argv) {
  const args = {
    from: null,
    output: '.env.prod',
    dryRun: false,
    force: false,
    target: 'docker-compose',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from' && i + 1 < argv.length) {
      args.from = argv[++i];
    } else if (arg === '--output' && i + 1 < argv.length) {
      args.output = argv[++i];
    } else if (arg === '--target' && i + 1 < argv.length) {
      const value = argv[++i];
      if (!ALLOWED_DEPLOY_TARGETS.includes(/** @type {any} */ (value))) {
        console.error(
          `error: --target value "${value}" is not supported. Supported targets: ${ALLOWED_DEPLOY_TARGETS.join(', ')}.`,
        );
        process.exit(1);
      }
      args.target = /** @type {any} */ (value);
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  const lines = [
    'Usage: setup-prod-env.mjs [options]',
    '',
    'Write a .env.prod file for the release-1 docker compose target.',
    '',
    'Options:',
    '  --from <path>      Read manifest JSON instead of prompting. Run with a',
    '                     non-existent path for a one-shot template (printed to',
    '                     stderr) and exit 1.',
    '  --output <path>     Output file (default: .env.prod next to this script)',
    '  --target <name>    Deploy target that switches the public-URL default',
    '                     values. Allowed: docker-compose (default), railway.',
    '                     For railway, the four public-URL keys default to the',
    '                     production custom domains (app.resubuild.dev,',
    '                     api.resubuild.dev). The manifest DEPLOY_TARGET key',
    '                     (if set) wins over this flag.',
    '  --dry-run           Print to stdout instead of writing',
    '  --force             Override placeholder check (for re-deploys)',
    '  -h, --help          Show this help',
    '',
    'Examples:',
    '  node scripts/setup-prod-env.mjs                    # interactive',
    '  node scripts/setup-prod-env.mjs --dry-run          # preview',
    '  node scripts/setup-prod-env.mjs --from manifest.json',
    '  node scripts/setup-prod-env.mjs --target railway --from manifest.json',
  ];
  console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

/**
 * Prompt with hidden input (for secrets).
 * Falls back to visible input if raw mode fails.
 * @param {string} key
 * @param {string} currentValue
 * @param {string} description
 * @param {boolean} isSecret
 * @returns {Promise<string>}
 */
async function promptForKey(key, currentValue, description, isSecret) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // Show current / suggested value
  const promptStr = isSecret
    ? `${description}\n${key} [${currentValue ? '(current value hidden)' : '(leave blank to keep current)'}]: `
    : `${description}\n${key} [${currentValue || '(required)'}]: `;

  return new Promise((resolve) => {
    if (isSecret) {
      // Try raw mode for hidden input
      process.stdout.write(promptStr);
      const chunks = [];

      const onKeypress = (chunk) => {
        const str = chunk.toString('utf8');
        for (const char of str) {
          if (char === '\n' || char === '\r') {
            process.stdin.off('keypress', onKeypress);
            process.stdin.setRawMode(false);
            process.stdout.write('\n');
            const value = chunks.join('');
            resolve(value);
            rl.close();
            return;
          }
          if (char === '\u0003') {
            // Ctrl+C
            process.exit(130);
          }
          chunks.push(char);
        }
      };

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('keypress', onKeypress);
    } else {
      rl.question(promptStr, (value) => {
        rl.close();
        resolve(value.trim());
      });
    }
  }).catch(() => {
    rl.close();
    throw new Error(`Failed to read ${key}`);
  });
}

/** @returns {Promise<Record<string,string>>} */
async function interactiveCollect() {
  /** @type {Record<string,string>} */
  const manifest = {};

  const groups = [
    {
      title: 'Supabase',
      keys: [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_JWT_SECRET',
      ],
    },
    { title: 'Storage', keys: ['MEDIA_BUCKET', 'MCP_EXPORT_BUCKET'] },
    {
      title: 'Server',
      keys: ['PORT', 'CORS_ORIGIN', 'APP_URL', 'PUBLIC_API_URL'],
    },
    { title: 'Web', keys: ['NEXT_PUBLIC_API_URL'] },
    {
      title: 'AI / PDF Import',
      keys: [
        'AI_AGENT_ENCRYPTION_KEY',
        'PDF_IMPORT_MAX_BYTES',
        'PDF_IMPORT_ENABLED',
        'IMPORT_MODELS_CATALOG_SOURCE',
      ],
    },
    { title: 'PDF Export (Chromium)', keys: ['CHROMIUM_EXECUTABLE_PATH'] },
    {
      title: 'MCP Server',
      keys: [
        'MCP_KEY_PEPPER',
        'MCP_SERVER_ENABLED',
        'MCP_EXPORT_TTL_SECONDS',
        'MCP_EXPORT_MAX_BYTES',
      ],
    },
  ];

  for (const group of groups) {
    console.log(`\n── ${group.title} ──`);
    for (const key of group.keys) {
      const schema = MANIFEST_SCHEMA[key];
      if (!schema) continue;

      let value;
      if (schema.secret) {
        value = await promptForKey(key, '', schema.description, true);
      } else {
        value = await promptForKey(key, '', schema.description, false);
      }
      if (value !== '') {
        manifest[key] = value;
      }
    }
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

/** Check if a path is tracked by git. Returns true if tracked. */
function isGitTracked(filePath) {
  try {
    execSync(`git ls-files --error-unmatch "${filePath}"`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Write atomically: to <path>.tmp then rename.
 * Opens with O_NOFOLLOW | O_CREAT | O_EXCL semantics via 'wx' flag.
 * @param {string} filePath
 * @param {string} content
 */
function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp`;
  let fd;
  try {
    // 'wx' = write, exclusive create, no-follow
    fd = openSync(tmp, 'wx', 0o644);
    writeFileSync(fd, content, { encoding: 'utf8' });
    closeSync(fd);
    fd = undefined;
    renameSync(tmp, filePath);
  } catch (err) {
    // Clean up tmp on error
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
    try {
      renameSync(tmp, filePath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** @param {Record<string,string>} manifest */
/** @param {{ from: string|null, output: string, dryRun: boolean, force: boolean, target: "docker-compose"|"railway" }} options */
async function run(manifest, options) {
  const { output: outputPath, dryRun, force, target: cliTarget } = options;
  const absOutput = isAbsolute(outputPath) ? resolve(outputPath) : resolve(REPO_ROOT, outputPath);

  // 0. Resolve the effective target. The manifest's DEPLOY_TARGET
  //    (when set and valid) wins over the --target CLI flag.
  //    resolveTarget falls back to the CLI flag when the manifest is
  //    silent, and falls back to the CLI flag even when the manifest
  //    declares an unknown value (validateManifest will reject the
  //    unknown value below so no bogus file is written).
  const target = resolveTarget(manifest, cliTarget);
  if (
    manifest.DEPLOY_TARGET !== undefined &&
    manifest.DEPLOY_TARGET !== '' &&
    manifest.DEPLOY_TARGET !== cliTarget
  ) {
    // Surface the discrepancy once. The manifest wins, but the
    // operator should know they typed --target foo and the manifest
    // overrode it.
    console.warn(
      `⚠ Manifest DEPLOY_TARGET="${manifest.DEPLOY_TARGET}" overrides --target="${cliTarget}". Using "${target}".`,
    );
  }

  // 1. Apply defaults for optional keys
  const { appliedDefaults } = applyDefaults(manifest);

  // 2. Auto-generate AI_AGENT_ENCRYPTION_KEY if absent or empty
  const generatedKeys = new Set(appliedDefaults);
  const placeholderKeys = new Set();

  if (!manifest.AI_AGENT_ENCRYPTION_KEY || manifest.AI_AGENT_ENCRYPTION_KEY === '') {
    const generated = randomBytes(32).toString('base64');
    manifest.AI_AGENT_ENCRYPTION_KEY = generated;
    generatedKeys.add('AI_AGENT_ENCRYPTION_KEY');
  } else if (manifest.AI_AGENT_ENCRYPTION_KEY === 'change-me-to-a-long-random-secret' && force) {
    placeholderKeys.add('AI_AGENT_ENCRYPTION_KEY');
  }

  // 3. Validate
  const { valid, errors, warnings } = validateManifest(manifest, { allowPlaceholders: force });
  if (!valid) {
    console.error('Validation failed:');
    for (const err of errors) {
      console.error(`  ✗ ${err}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    for (const warn of warnings) {
      console.warn(`  ⚠ ${warn}`);
    }
  }

  // 4. Check git tracking
  if (!dryRun) {
    if (isGitTracked(absOutput)) {
      console.error(`error: ${absOutput} is tracked by git; remove it from the index first`);
      console.error('see openspec/specs/prod-env-bootstrap-helper/spec.md');
      process.exit(1);
    }
  }

  // 5. Serialize
  const content = serializeToDotenv(manifest, {
    generatedKeys,
    placeholderKeys,
    target,
  });

  if (dryRun) {
    process.stdout.write(content);
    if (warnings.length > 0) {
      process.stderr.write(`\n⚠ Warnings: ${warnings.join(', ')}\n`);
    }
    return;
  }

  // 6. Write atomically
  try {
    atomicWrite(absOutput, content);
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.error(`error: ${absOutput} already exists and is not writable`);
      process.exit(1);
    }
    throw err;
  }

  // Count keys
  const totalKeys = Object.keys(manifest).filter((k) => manifest[k] !== '').length;
  const genCount = generatedKeys.size;
  const placeholderCount = placeholderKeys.size;

  console.log(`Wrote ${absOutput}`);
  console.log(
    `${totalKeys} keys written${genCount > 0 ? ` (${genCount} auto-generated)` : ''}${
      placeholderCount > 0 ? ` (${placeholderCount} placeholders)` : ''
    }`,
  );

  if (placeholderCount > 0) {
    console.warn(
      `⚠ ${placeholderCount} placeholder key(s) written — replace with real values before deploying`,
    );
  }

  if (target === 'railway') {
    console.log(
      '\nNext: confirm the four public-URL values in .env.prod match the production',
      'custom domains (app.resubuild.dev for the web app, api.resubuild.dev for',
      'the API). If your Railway-printed public domain differs, update the values',
      'before deploying. Then run pnpm deploy:railway to print the next two',
      '`railway up --service <name>` commands.',
    );
  } else {
    console.log(
      '\nNext: run `docker compose -f docker-compose.prod.yml --env-file .env.prod config` to verify.',
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const options = parseArgs(process.argv.slice(2));
let manifest;

if (options.from) {
  // Load from file
  const absFrom = isAbsolute(options.from)
    ? resolve(options.from)
    : resolve(REPO_ROOT, options.from);

  try {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(absFrom, 'utf8');
    const result = parseManifest(text);
    if (result.parseError) {
      console.error(`error: failed to parse manifest: ${result.parseError}`);
      process.exit(1);
    }
    manifest = result.manifest;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`error: manifest not found: ${absFrom}`);
      console.error('');
      console.error('  The manifest file is gitignored (it contains secrets). Create it at the');
      console.error('  repo root with at minimum the required Supabase credentials, then re-run');
      console.error('  this command. Template:');
      console.error('');
      console.error('    {');
      console.error('      "SUPABASE_URL": "https://xxxx.supabase.co",');
      console.error('      "SUPABASE_ANON_KEY": "eyJ...",');
      console.error('      "SUPABASE_SERVICE_ROLE_KEY": "eyJ...",');
      console.error('      "MEDIA_BUCKET": "media",');
      console.error('      "MCP_EXPORT_BUCKET": "mcp-exports",');
      console.error('      "CORS_ORIGIN": "https://app.example.com",');
      console.error('      "APP_URL": "https://app.example.com",');
      console.error('      "PUBLIC_API_URL": "https://api.example.com",');
      console.error('      "NEXT_PUBLIC_API_URL": "https://api.example.com",');
      console.error(
        '      "AI_AGENT_ENCRYPTION_KEY": "REPLACE_WITH_REAL_KEY_OR_LEAVE_BLANK_FOR_AUTO_GENERATION"',
      );
      console.error('    }');
      console.error('');
      console.error('  For the Railway target, the four public-URL keys default to the');
      console.error('  production custom domains (app.resubuild.dev, api.resubuild.dev) so');
      console.error('  you can omit them from the manifest if your services already have');
      console.error('  those domains attached.');
      console.error('');
      console.error('  See .cursor/skills/railway-deploy/SKILL.md (Railway) or');
      console.error('  .cursor/skills/setup-prod-env/SKILL.md (docker compose) for the full');
      console.error('  workflow.');
      process.exit(1);
    }
    throw err;
  }

  // When using --from, AI_AGENT_ENCRYPTION_KEY must be present (CI determinism)
  if (!manifest.AI_AGENT_ENCRYPTION_KEY && !options.force) {
    console.error(`error: AI_AGENT_ENCRYPTION_KEY is missing from manifest and --from is in use.`);
    console.error('  Either supply AI_AGENT_ENCRYPTION_KEY in the manifest,');
    console.error('  or run interactively (no --from) to auto-generate it.');
    process.exit(1);
  }
} else {
  // Interactive
  manifest = await interactiveCollect();
}

await run(manifest, options);
