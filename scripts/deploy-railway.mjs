#!/usr/bin/env node

/**
 * scripts/deploy-railway.mjs
 *
 * Thin preflight wrapper for the release-1 Railway deploy target.
 *
 * Responsibilities:
 *   1. Read .env.prod at the repo root.
 *   2. Reuse scripts/lib/env-prod-schema.mjs's manifest parser +
 *      validator to confirm every required key is present and
 *      well-formed (the same validation the docker compose target
 *      consumes).
 *   3. On failure, exit non-zero with a one-line error naming the
 *      missing or invalid keys, and a one-line note pointing the
 *      operator at the fix.
 *   4. On success, print the two `railway up --service <name>`
 *      commands and exit zero.
 *
 * This script does NOT call `railway up` itself. The Railway CLI's
 * deploy command is interactive and service-scoped; wrapping it
 * non-interactively would either hide failures or require a new
 * flag set the operator has to learn. The thin wrapper just
 * validates the preflight and prints the next command — the
 * operator runs the deploy interactively and watches the build log.
 *
 * Usage:
 *   node scripts/deploy-railway.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest, validateManifest } from './lib/env-prod-schema.mjs';

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const ENV_PROD_PATH = resolve(REPO_ROOT, '.env.prod');

const FIX_HINT =
  'fix: run `pnpm setup:env:prod --target railway --from prod-secrets.json` to (re)generate .env.prod.';

const RAILWAY_UP_COMMANDS = ['railway up --service api', 'railway up --service web'];

/**
 * Parse a dotenv file into a manifest object. Only handles
 * KEY=VALUE lines (no export, no multiline). Empty lines and
 * `#`-prefixed comments are ignored.
 *
 * @param {string} text
 * @returns {Record<string,string>}
 */
function parseDotenv(text) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip inline `# comment` after a value (only if not inside
    // quotes — keep this simple: drop a trailing `  # ...`).
    const hashIdx = value.indexOf('  #');
    if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    // Strip a single layer of double quotes if present.
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    if (value === '') continue;
    out[key] = value;
  }
  return out;
}

function main() {
  let envText;
  try {
    envText = readFileSync(ENV_PROD_PATH, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(
        `error: .env.prod not found at ${ENV_PROD_PATH}. Run \`pnpm setup:env:prod --target railway --from prod-secrets.json\` first.`,
      );
      console.error(FIX_HINT);
      process.exit(1);
    }
    throw err;
  }

  // 1. Convert .env.prod into a manifest the schema validator can
  //    consume. parseManifest expects a JSON string, so we go
  //    dotenv -> object -> JSON.
  const envAsObject = parseDotenv(envText);
  const manifestText = JSON.stringify(envAsObject);
  const { manifest, parseError } = parseManifest(manifestText);
  if (parseError) {
    console.error(`error: failed to parse .env.prod into a manifest: ${parseError}`);
    process.exit(1);
  }

  // 2. Reuse the schema validator. The docker compose set is the
  //    release-1 baseline; Railway consumes the same env-var
  //    surface, so the same required-key set applies.
  const { valid, errors } = validateManifest(manifest);
  if (!valid) {
    const msg = errors.length === 1 ? errors[0] : errors.join('; ');
    console.error(`error: .env.prod is missing or invalid keys: ${msg}`);
    console.error(FIX_HINT);
    process.exit(1);
  }

  // 3. Preflight passed — print the two deploy commands and exit.
  console.log('Preflight OK. .env.prod is present and well-formed.');
  console.log('');
  console.log('Next steps (run in order, watching each build log):');
  for (const cmd of RAILWAY_UP_COMMANDS) {
    console.log(`  ${cmd}`);
  }
  console.log('');
  console.log('Verify with:');
  console.log('  curl -f https://api.resubuild.dev/_health');
  console.log('  curl -f https://app.resubuild.dev/');
}

main();
