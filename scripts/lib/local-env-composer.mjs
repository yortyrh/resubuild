/**
 * Compose the `apps/api/.env` and `apps/web/.env` file bodies written by
 * `scripts/setup-local-env.sh`. Pure functions: no I/O, no subprocess, no
 * env lookup. Inputs come from `supabase status -o env`, the operator's
 * existing `apps/api/.env` (for re-run preservation), and CLI flags.
 *
 * Re-run preservation is the whole point of this module. The previous
 * shell heredoc rewrote `apps/api/.env` from scratch and silently dropped
 * any operator-tweaked variables (notably the AUTH_* and
 * SUPABASE_AUTH_EXTERNAL_* feature flags plus SUPABASE_PUBLISHABLE_KEY).
 * Re-running the script wiped the operator's local config every time.
 *
 * Two categories of keys are written:
 *
 *   1. CLI-derived (refilled every run from `supabase status -o env`):
 *        SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *        SUPABASE_JWT_SECRET, SUPABASE_PUBLISHABLE_KEY (when the CLI
 *        exposes it)
 *   2. Operator-controlled (preserved verbatim from the previous
 *      `apps/api/.env` when present, defaulted to `false` on first
 *      run). These are environment-specific toggles the operator
 *      sets to enable auth features and OAuth providers; the
 *      Supabase CLI does not know about them and the script
 *      must not clobber them.
 *
 * Keeping the operator-controlled keys in this module (rather than
 * re-deriving them from `supabase/config.toml`) matches the auth
 * spec contract: the env var is the source of truth for the API
 * (`AuthConfigService` reads it directly) and the operator sets
 * them deliberately per environment.
 */

/** @typedef {Record<string, string | undefined>} EnvMap */
import { existsSync, readFileSync } from 'node:fs';

/**
 * Keys that the operator (not Supabase) controls in `apps/api/.env`.
 * Each maps to a default applied on first run when the previous
 * `.env` is absent. Re-running the script MUST NOT silently change
 * these — they encode operator decisions about which optional auth
 * flows are exposed in the current environment.
 *
 * Only the server-side `AUTH_FORGOT_PASSWORD_ENABLED` flag lives
 * here (consumed by `AuthConfigService` and the
 * `ForgotPasswordEnabledGuard` on the API). The other four
 * capability flags were moved to the web side as `NEXT_PUBLIC_*`
 * mirrors — see {@link WEB_OPERATOR_CONTROLLED_KEYS} and
 * `apps/web/src/lib/auth/features.ts`. Keeping them out of the API
 * env removes the `/auth/features` round-trip and the layout shift
 * it caused.
 */
export const OPERATOR_CONTROLLED_KEYS = Object.freeze(['AUTH_FORGOT_PASSWORD_ENABLED']);

/**
 * @param {EnvMap} previousEnv
 * @returns {EnvMap}
 */
export function readOperatorControlledValues(previousEnv) {
  /** @type {EnvMap} */
  const out = {};
  for (const key of OPERATOR_CONTROLLED_KEYS) {
    const raw = previousEnv[key];
    out[key] = raw === undefined || raw === '' ? 'false' : raw;
  }
  return out;
}

/**
 * Parse a dotenv-style file body into a flat key/value map. Comments
 * (lines starting with `#`) and blank lines are ignored. Values are
 * taken verbatim after the first `=`; surrounding whitespace is
 * trimmed. Quotes are NOT stripped — the bash script does not quote
 * its values, so the operator-controlled values are usually bare
 * `true` / `false` strings already.
 *
 * @param {string | null | undefined} contents
 * @returns {EnvMap}
 */
export function parseDotenv(contents) {
  /** @type {EnvMap} */
  const out = {};
  if (!contents) return out;
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Compose the `apps/api/.env` file body.
 *
 * `cliPublishableKey` is the value the script pulled from
 * `supabase status -o env` (where the CLI emits it as `PUBLISHABLE_KEY=...`).
 * When the CLI is too old to expose it, we fall back to the value
 * already in `previousEnv` so re-runs after a CLI upgrade keep the
 * key. `SUPABASE_PUBLISHABLE_KEY` is required at API boot per
 * `apps/api/src/auth/config/auth.config.ts`, so dropping it on a
 * re-run is what blocks the API from starting.
 *
 * The other operator-controlled feature flags
 * (`AUTH_EMAIL_VERIFICATION_ENABLED`, `AUTH_PASSWORDLESS_ENABLED`) are NOT written to the
 * API env: they live exclusively on the web side as
 * `NEXT_PUBLIC_*` mirrors (see `composeWebEnv` and
 * `apps/web/src/lib/auth/features.ts`). Keeping them off the API
 * eliminates the `/auth/features` round-trip and the layout shift
 * it caused. `AUTH_FORGOT_PASSWORD_ENABLED` stays in the API env
 * because the server-side `ForgotPasswordEnabledGuard` still reads
 * it.
 *
 * @param {{
 *   apiUrl: string,
 *   anonKey: string,
 *   serviceRoleKey: string,
 *   jwtSecret: string,
 *   cliPublishableKey: string | undefined,
 *   mediaBucket: string,
 *   mcpExportBucket: string,
 *   port: string,
 *   corsOrigin: string,
 *   publicApiUrl: string,
 *   aiAgentEncryptionKey: string,
 *   pdfImportMaxBytes: string,
 *   pdfImportEnabled: string,
 *   previousEnv: EnvMap,
 * }} input
 * @returns {string}
 */
export function composeApiEnv(input) {
  const operator = readOperatorControlledValues(input.previousEnv);
  const publishableKey =
    input.cliPublishableKey && input.cliPublishableKey !== ''
      ? input.cliPublishableKey
      : (input.previousEnv.SUPABASE_PUBLISHABLE_KEY ?? '');

  return [
    '# Generated by scripts/setup-local-env.sh — re-run after `supabase start` / key changes.',
    '# Source: supabase status -o env',
    '',
    `SUPABASE_URL=${input.apiUrl}`,
    `SUPABASE_ANON_KEY=${input.anonKey}`,
    '',
    '# Publishable key for the browser Supabase client (safe in client bundles).',
    '# Required by AuthConfigService at API boot. Sourced from `supabase status`;',
    '# preserved from the previous .env on re-run when the CLI does not expose it.',
    `SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    '',
    '# Server-only: Storage uploads (`POST /media/upload`)',
    `SUPABASE_SERVICE_ROLE_KEY=${input.serviceRoleKey}`,
    `MEDIA_BUCKET=${input.mediaBucket}`,
    `MCP_EXPORT_BUCKET=${input.mcpExportBucket}`,
    '',
    '# Optional legacy JWT secret — not required for API auth validation',
    `SUPABASE_JWT_SECRET=${input.jwtSecret}`,
    '',
    `PORT=${input.port}`,
    `CORS_ORIGIN=${input.corsOrigin}`,
    `APP_URL=${input.corsOrigin}`,
    `PUBLIC_API_URL=${input.publicApiUrl}`,
    '',
    '# Auth feature flags — server-side enforcement only. The other auth',
    '# capability flags (email-verification, passwordless, GitHub, Google)',
    '# are resolved client-side from apps/web/.env (NEXT_PUBLIC_* mirrors).',
    `AUTH_FORGOT_PASSWORD_ENABLED=${operator.AUTH_FORGOT_PASSWORD_ENABLED}`,
    '',
    '# PDF import + per-user AI agent / web scrape settings (keys configured in the app UI)',
    `AI_AGENT_ENCRYPTION_KEY=${input.aiAgentEncryptionKey}`,
    `PDF_IMPORT_MAX_BYTES=${input.pdfImportMaxBytes}`,
    `PDF_IMPORT_ENABLED=${input.pdfImportEnabled}`,
    '',
  ].join('\n');
}

/**
 * Compose the `apps/web/.env` file body.
 *
 * Three categories of keys are written:
 *
 *   1. CLI-derived (refilled every run from `supabase status -o env`):
 *        `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 *        — required for the SPA to boot. They follow the same
 *        preservation rule as on the api side: the freshly-pulled
 *        CLI value wins, but if the CLI is too old to expose
 *        `PUBLISHABLE_KEY` the value from the previous
 *        `apps/web/.env` is kept. A re-run must never silently wipe
 *        the publishable key from the web bundle, which would
 *        otherwise break every browser-driven Supabase call.
 *
 *   2. Operator-controlled mirrors of the auth feature flags
 *      (`NEXT_PUBLIC_AUTH_*`).
 *      These are sourced from the previous `apps/web/.env` when
 *      present (so re-runs preserve operator changes) and default
 *      to `false` on first run. The SPA reads them directly at
 *      build time via `process.env.NEXT_PUBLIC_*` to decide which
 *      auth controls to render — see `apps/web/src/lib/auth/features.ts`.
 *      This replaces the previous `GET /auth/features` round-trip
 *      and removes the layout shift the round-trip caused.
 *
 *   3. `NEXT_PUBLIC_API_URL` — the browser → Nest base URL.
 *
 * `NEXT_PUBLIC_DEV_MAILPIT_URL` is intentionally not written here
 * either; the .env.example documents it as optional and the
 * dev-mailpit component falls back to `http://127.0.0.1:54324` when
 * unset.
 *
 * @param {{
 *   publicApiUrl: string,
 *   supabaseUrl: string,
 *   cliPublishableKey: string,
 *   previousEnv: EnvMap,
 * }} input
 * @returns {string}
 */
export function composeWebEnv(input) {
  const supabaseUrl =
    input.supabaseUrl && input.supabaseUrl !== ''
      ? input.supabaseUrl
      : (input.previousEnv.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321');
  const publishableKey =
    input.cliPublishableKey && input.cliPublishableKey !== ''
      ? input.cliPublishableKey
      : (input.previousEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '');

  // Mirror the auth feature flags from the previous web .env so re-runs
  // preserve operator decisions. Defaults to 'false' on the first run,
  // matching apps/web/.env.example. The GitHub OAuth flag is web-only —
  // the SPA uses it to decide whether to render the "Continue with
  // GitHub" button. The actual provider liveness is controlled by the
  // `[auth.external.github]` block in supabase/config.toml (env vars
  // `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_SECRET`).
  const webOperator = readOperatorControlledWebValues(input.previousEnv);

  return [
    '# Generated by scripts/setup-local-env.sh',
    '# Browser → Nest API over CORS (Bearer JSON).',
    '',
    `NEXT_PUBLIC_API_URL=${input.publicApiUrl}`,
    '',
    '# Supabase browser client (for auth flows: passwordless, OTP, session mgmt).',
    '# The publishable key is the ONLY Supabase key allowed in client bundles —',
    '# service-role keys MUST stay in apps/api (server-only). The carve-out is',
    '# enforced by apps/web/src/lib/web-bundle-security.test.ts.',
    `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
    '',
    '# Auth feature flags (client-only — see apps/web/src/lib/auth/features.ts).',
    '# Mirrors apps/api/.env so the SPA can render the right auth controls without',
    '# an /auth/features round-trip. Next.js inlines NEXT_PUBLIC_* at build time;',
    '# a change here requires a redeploy to take effect in production.',
    `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED=${webOperator.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED}`,
    `NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED=${webOperator.NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED}`,
    `NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED=${webOperator.NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED}`,
    `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED=${webOperator.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED}`,
    '',
  ].join('\n');
}

/**
 * Same semantics as {@link readOperatorControlledValues} but for the
 * web-mirror keyspace. Each key maps to the `NEXT_PUBLIC_*` mirror
 * that the SPA reads at build time. Re-runs preserve the operator's
 * value; first run defaults to `false` (consistent with
 * `apps/web/.env.example`).
 *
 * @param {EnvMap} previousWebEnv
 * @returns {EnvMap}
 */
export function readOperatorControlledWebValues(previousWebEnv) {
  /** @type {EnvMap} */
  const out = {};
  for (const mirrorKey of WEB_OPERATOR_CONTROLLED_KEYS) {
    const raw = previousWebEnv[mirrorKey];
    out[mirrorKey] = raw === undefined || raw === '' ? 'false' : raw;
  }
  return out;
}

/**
 * The `NEXT_PUBLIC_*` mirror keys written to `apps/web/.env`.
 * `NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED` mirrors the API-side
 * `AUTH_FORGOT_PASSWORD_ENABLED` flag; the other three are web-only.
 * `NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED` gates the "Continue with
 * GitHub" button on `/login` and `/register`; the actual provider
 * liveness is controlled by the `[auth.external.github]` block in
 * `supabase/config.toml` (env vars `GITHUB_OAUTH_CLIENT_ID` and
 * `GITHUB_OAUTH_SECRET`).
 */
export const WEB_OPERATOR_CONTROLLED_KEYS = Object.freeze([
  'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED',
  'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED',
  'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED',
  'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED',
]);

/**
 * The Supabase-side env vars written to `supabase/.env` for the local
 * stack. The GitHub OAuth stub values are NON-FUNCTIONAL: clicking
 * "Continue with GitHub" while these stubs are in place will fail
 * with a "Sign-in failed" toast. Operators MUST replace them with
 * real GitHub OAuth app credentials (`GITHUB_OAUTH_CLIENT_ID` and
 * `GITHUB_OAUTH_SECRET` from a real OAuth app registration) to
 * enable the provider. The stubs exist solely so `supabase start`
 * does not fail when the `[auth.external.github]` block in
 * `supabase/config.toml` reads `env(GITHUB_OAUTH_*)`.
 *
 * Re-runs preserve the operator's real values verbatim — only the
 * first run writes the `github-oauth-stub` defaults.
 */
export const SUPABASE_OPERATOR_CONTROLLED_KEYS = Object.freeze([
  'GITHUB_OAUTH_CLIENT_ID',
  'GITHUB_OAUTH_SECRET',
]);

/**
 * Compose the `supabase/.env` file body.
 *
 * On first run, both `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_SECRET`
 * are written as `github-oauth-stub` so `supabase start` boots cleanly
 * (the `[auth.external.github]` block in `supabase/config.toml`
 * resolves these via `env(...)`). Re-runs preserve the operator's
 * real values when present.
 *
 * @param {{
 *   previousEnv: EnvMap,
 * }} input
 * @returns {string}
 */
export function composeSupabaseEnv(input) {
  const operator = readSupabaseOperatorControlledValues(input.previousEnv);
  return [
    '# Generated by scripts/setup-local-env.sh on first run.',
    '# GitHub OAuth credentials consumed by the [auth.external.github] block',
    '# in supabase/config.toml via env() interpolation. The stub values below',
    '# are NON-FUNCTIONAL — replace them with the client_id and secret from a',
    '# real GitHub OAuth app registration (https://github.com/settings/developers).',
    '# See openspec/specs/auth-github-oauth/spec.md for the end-to-end flow.',
    `GITHUB_OAUTH_CLIENT_ID=${operator.GITHUB_OAUTH_CLIENT_ID}`,
    `GITHUB_OAUTH_SECRET=${operator.GITHUB_OAUTH_SECRET}`,
    '',
  ].join('\n');
}

/**
 * @param {EnvMap} previousSupabaseEnv
 * @returns {EnvMap}
 */
export function readSupabaseOperatorControlledValues(previousSupabaseEnv) {
  /** @type {EnvMap} */
  const out = {};
  for (const key of SUPABASE_OPERATOR_CONTROLLED_KEYS) {
    const raw = previousSupabaseEnv[key];
    out[key] = raw === undefined || raw === '' ? 'github-oauth-stub' : raw;
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI entry point — invoked by scripts/setup-local-env.sh via
// `node scripts/lib/local-env-composer.mjs <api|web> <json-input>`.
// Lives in the same module so the script and the tests share the
// exact same code path; the bash script only assembles inputs.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CliInput
 * @property {string} [apiUrl]
 * @property {string} [anonKey]
 * @property {string} [serviceRoleKey]
 * @property {string} [jwtSecret]
 * @property {string} [cliPublishableKey]
 * @property {string} [mediaBucket]
 * @property {string} [mcpExportBucket]
 * @property {string} [port]
 * @property {string} [corsOrigin]
 * @property {string} [publicApiUrl]
 * @property {string} [aiAgentEncryptionKey]
 * @property {string} [pdfImportMaxBytes]
 * @property {string} [pdfImportEnabled]
 * @property {string} [previousEnvPath]
 * @property {string} [webPreviousEnvPath]
 * @property {string} [supabasePreviousEnvPath]
 */

/**
 * @param {string} target
 * @param {CliInput} input
 * @returns {string}
 */
export function runCli(target, input) {
  if (target === 'api') {
    /** @type {EnvMap} */
    let previousEnv = {};
    if (input.previousEnvPath) {
      if (existsSync(input.previousEnvPath)) {
        previousEnv = parseDotenv(readFileSync(input.previousEnvPath, 'utf8'));
      }
    }
    return composeApiEnv({
      apiUrl: input.apiUrl ?? '',
      anonKey: input.anonKey ?? '',
      serviceRoleKey: input.serviceRoleKey ?? '',
      jwtSecret: input.jwtSecret ?? '',
      cliPublishableKey: input.cliPublishableKey ?? '',
      mediaBucket: input.mediaBucket ?? 'media',
      mcpExportBucket: input.mcpExportBucket ?? 'mcp-exports',
      port: input.port ?? '3001',
      corsOrigin: input.corsOrigin ?? 'http://localhost:3000',
      publicApiUrl: input.publicApiUrl ?? 'http://localhost:3001',
      aiAgentEncryptionKey: input.aiAgentEncryptionKey ?? '',
      pdfImportMaxBytes: input.pdfImportMaxBytes ?? '5242880',
      pdfImportEnabled: input.pdfImportEnabled ?? 'true',
      previousEnv,
    });
  }
  if (target === 'web') {
    /** @type {EnvMap} */
    let previousEnv = {};
    if (input.webPreviousEnvPath) {
      if (existsSync(input.webPreviousEnvPath)) {
        previousEnv = parseDotenv(readFileSync(input.webPreviousEnvPath, 'utf8'));
      }
    }
    return composeWebEnv({
      publicApiUrl: input.publicApiUrl ?? 'http://localhost:3001',
      // The Supabase URL is the same one Nest is talking to, so the
      // local CLI's API_URL is the right source. Fall back to the
      // previous web .env, then to the documented local default.
      supabaseUrl: input.apiUrl ?? '',
      cliPublishableKey: input.cliPublishableKey ?? '',
      previousEnv,
    });
  }
  if (target === 'supabase') {
    /** @type {EnvMap} */
    let previousEnv = {};
    if (input.supabasePreviousEnvPath) {
      if (existsSync(input.supabasePreviousEnvPath)) {
        previousEnv = parseDotenv(readFileSync(input.supabasePreviousEnvPath, 'utf8'));
      }
    }
    return composeSupabaseEnv({ previousEnv });
  }
  throw new Error(`Unknown target "${target}" — expected "api", "web", or "supabase".`);
}

// When invoked directly from the command line (`node local-env-composer.mjs api '{...}'`),
// parse the JSON, call runCli, and print the result to stdout. Errors
// go to stderr with a non-zero exit so the bash script can react.
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('local-env-composer.mjs')
) {
  const [, , target, jsonArg] = process.argv;
  if (!target) {
    process.stderr.write('usage: node local-env-composer.mjs <api|web|supabase> [json-input]\n');
    process.exit(2);
  }
  // Accept the JSON payload either as the third argv (e.g. when called
  // from a CI step) or via stdin (when piped from a shell command).
  const source = jsonArg && jsonArg !== '' ? Promise.resolve(jsonArg) : readStdin();
  source
    .then((raw) => {
      /** @type {CliInput} */
      const input = JSON.parse(raw);
      process.stdout.write(runCli(target, input));
    })
    .catch((err) => {
      process.stderr.write(
        `local-env-composer: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(1);
    });
}

/**
 * Read all of stdin as UTF-8. Returns "" when stdin is a TTY (no
 * pipe) so the caller can distinguish "no input" from "empty input".
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    /** @type {Buffer[]} */
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}
