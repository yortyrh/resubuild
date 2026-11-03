/**
 * Manifest schema for the release-1 production .env generator.
 *
 * Exposes three pure functions (no I/O) shared by:
 *   - scripts/setup-prod-env.mjs  (the script engine)
 *
 * Manifest format: JSON object, keys = env var names, values = strings.
 * Optional keys may be absent.  Required keys must be present.
 *
 * DEPLOY_TARGET is a generator-internal key — it switches the public-URL
 * placeholder template that `serializeToDotenv` writes. It is NOT an
 * api/web runtime key, so it MUST NOT appear in `apps/api/.env.example`
 * or `apps/web/.env.example` (the drift test enforces this). Allowed
 * values are the closed set in `ALLOWED_DEPLOY_TARGETS`.
 */

const PLACEHOLDER = 'change-me-to-a-long-random-secret';

export const ALLOWED_DEPLOY_TARGETS = /** @type {const} */ (['docker-compose', 'railway']);

/** @type {Record<string, { required: boolean, secret?: boolean, description: string, group: string, default?: string }>} */
export const MANIFEST_SCHEMA = {
  // Database
  DATABASE_URL: {
    required: true,
    secret: true,
    description:
      'Postgres connection string (postgresql://user:pass@host:5432/db?sslmode=require). Any Postgres 15+: Railway, DigitalOcean, AWS RDS, self-hosted.',
    group: 'Database',
  },
  DATABASE_POOL_MAX: {
    required: false,
    description: 'Maximum connections in the API pool (default 10)',
    group: 'Database',
  },

  // Object storage (S3 API)
  S3_ENDPOINT: {
    required: false,
    description:
      'S3-compatible endpoint (DigitalOcean Spaces, Railway Buckets, MinIO, R2…). Leave empty for AWS S3.',
    group: 'Storage',
  },
  S3_PUBLIC_ENDPOINT: {
    required: false,
    description:
      'Endpoint used to sign download URLs given to clients (defaults to S3_ENDPOINT; set when the API reaches storage on an internal host)',
    group: 'Storage',
  },
  S3_REGION: {
    required: false,
    description: 'Bucket region (default us-east-1)',
    group: 'Storage',
    default: 'us-east-1',
  },
  S3_ACCESS_KEY_ID: {
    required: true,
    secret: true,
    description: 'Access key id with read/write access to both buckets',
    group: 'Storage',
  },
  S3_SECRET_ACCESS_KEY: {
    required: true,
    secret: true,
    description: 'Secret access key for S3_ACCESS_KEY_ID',
    group: 'Storage',
  },
  S3_FORCE_PATH_STYLE: {
    required: false,
    description:
      'Path-style bucket addressing (default: true when S3_ENDPOINT is set, false for AWS)',
    group: 'Storage',
  },
  S3_AUTO_CREATE_BUCKETS: {
    required: false,
    description:
      'Create MEDIA_BUCKET and MCP_EXPORT_BUCKET at API start when missing (true for the selfhost compose profile; default false)',
    group: 'Storage',
  },
  MEDIA_BUCKET: {
    required: true,
    description: 'Private bucket for resume media uploads',
    group: 'Storage',
  },
  MCP_EXPORT_BUCKET: {
    required: true,
    description: 'Private bucket for MCP export artifacts',
    group: 'Storage',
  },

  // Email (SMTP)
  SMTP_URL: {
    required: false,
    secret: true,
    description:
      'SMTP connection URL (smtp://user:pass@host:587 or smtps://…:465). Alternative to SMTP_HOST/PORT/USER/PASSWORD.',
    group: 'Email',
  },
  SMTP_HOST: {
    required: false,
    description: 'SMTP server host (SES, Postmark, Resend, Mailgun, Brevo, your own MTA…)',
    group: 'Email',
  },
  SMTP_PORT: {
    required: false,
    description: 'SMTP port (default 587; 465 implies TLS)',
    group: 'Email',
  },
  SMTP_SECURE: {
    required: false,
    description: 'Use implicit TLS (default: true only on port 465)',
    group: 'Email',
  },
  SMTP_USER: {
    required: false,
    description: 'SMTP username',
    group: 'Email',
  },
  SMTP_PASSWORD: {
    required: false,
    secret: true,
    description: 'SMTP password or API key',
    group: 'Email',
  },
  MAIL_FROM: {
    required: true,
    description: 'Sender for transactional email, e.g. "Resubuild <no-reply@example.com>"',
    group: 'Email',
  },
  APP_NAME: {
    required: false,
    description: 'Product name used in email templates (default Resubuild)',
    group: 'Email',
  },

  // Server
  PORT: {
    required: false,
    description: 'Port the NestJS API listens on (default 3001)',
    group: 'Server',
    default: '3001',
  },
  CORS_ORIGIN: {
    required: true,
    description:
      'Comma-separated list of allowed CORS origins for the API (public URL of the web app)',
    group: 'Server',
  },
  APP_URL: {
    required: true,
    description: 'Public URL of the web application',
    group: 'Server',
  },
  WEB_URL: {
    required: false,
    description:
      'Public URL of the web app used in email links and OAuth redirects (defaults to APP_URL)',
    group: 'Server',
  },
  PUBLIC_API_URL: {
    required: true,
    description: 'Public URL the API is reachable at (used in media src attributes)',
    group: 'Server',
  },

  // Auth (Better Auth)
  BETTER_AUTH_SECRET: {
    required: true,
    secret: true,
    description:
      'Signs session tokens (≥32 random characters; auto-generated if absent in interactive mode). Rotating it signs everyone out.',
    group: 'Auth',
  },
  BETTER_AUTH_URL: {
    required: false,
    description:
      'Public API base URL for auth callbacks (defaults to PUBLIC_API_URL). OAuth redirect URI: <BETTER_AUTH_URL>/api/auth/callback/<provider>',
    group: 'Auth',
  },
  AUTH_FORGOT_PASSWORD_ENABLED: {
    required: false,
    description:
      'Enable forgot/reset password (default false). Mirror: NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED.',
    group: 'Auth',
    default: 'false',
  },
  AUTH_EMAIL_VERIFICATION_ENABLED: {
    required: false,
    description:
      'Require email verification before password sign-in (default false). Mirror: NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED.',
    group: 'Auth',
    default: 'false',
  },
  AUTH_PASSWORDLESS_ENABLED: {
    required: false,
    description:
      'Enable magic link + email code sign-in (default false). Mirror: NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED.',
    group: 'Auth',
    default: 'false',
  },
  GITHUB_CLIENT_ID: {
    required: false,
    description: 'GitHub OAuth app client id (provider enabled when id and secret are set)',
    group: 'Auth',
  },
  GITHUB_CLIENT_SECRET: {
    required: false,
    secret: true,
    description: 'GitHub OAuth app client secret',
    group: 'Auth',
  },
  GOOGLE_CLIENT_ID: {
    required: false,
    description: 'Google OAuth client id',
    group: 'Auth',
  },
  GOOGLE_CLIENT_SECRET: {
    required: false,
    secret: true,
    description: 'Google OAuth client secret',
    group: 'Auth',
  },
  LINKEDIN_CLIENT_ID: {
    required: false,
    description: 'LinkedIn (OpenID Connect) client id',
    group: 'Auth',
  },
  LINKEDIN_CLIENT_SECRET: {
    required: false,
    secret: true,
    description: 'LinkedIn client secret',
    group: 'Auth',
  },

  // Web (Next.js) — inlined at build time
  NEXT_PUBLIC_API_URL: {
    required: true,
    description:
      'Public API URL that the Next.js browser bundle calls (same as PUBLIC_API_URL in most setups)',
    group: 'Web',
  },
  NEXT_PUBLIC_APP_URL: {
    required: false,
    description:
      'Public origin of the web app (password-reset redirectTo). Leave blank in local dev to fall back to window.location.origin.',
    group: 'Web',
  },
  NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED: {
    required: false,
    description: 'Web mirror of AUTH_FORGOT_PASSWORD_ENABLED (renders "Forgot password?")',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED: {
    required: false,
    description: 'Web mirror of AUTH_EMAIL_VERIFICATION_ENABLED',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED: {
    required: false,
    description: 'Web mirror of AUTH_PASSWORDLESS_ENABLED',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED: {
    required: false,
    description: 'Render "Continue with GitHub" (needs GITHUB_CLIENT_ID/SECRET on the API)',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED: {
    required: false,
    description: 'Render "Continue with Google" (needs GOOGLE_CLIENT_ID/SECRET on the API)',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED: {
    required: false,
    description: 'Render "Continue with LinkedIn" (needs LINKEDIN_CLIENT_ID/SECRET on the API)',
    group: 'Web',
    default: 'false',
  },
  NEXT_PUBLIC_DEV_MAILPIT_URL: {
    required: false,
    description: 'Local development only: Mailpit UI linked from auth screens',
    group: 'Web',
  },

  // AI / PDF import
  AI_AGENT_ENCRYPTION_KEY: {
    required: true,
    secret: true,
    description:
      'AES-256 encryption key for per-user AI agent settings (auto-generated if absent in interactive mode)',
    group: 'AI / PDF Import',
  },
  PDF_IMPORT_MAX_BYTES: {
    required: false,
    description: 'Maximum file size for PDF imports in bytes (default 5 MiB = 5242880)',
    group: 'AI / PDF Import',
    default: '5242880',
  },
  PDF_IMPORT_ENABLED: {
    required: false,
    description: 'Enable or disable PDF import feature (default true)',
    group: 'AI / PDF Import',
    default: 'true',
  },

  // Chromium / PDF export
  CHROMIUM_EXECUTABLE_PATH: {
    required: false,
    description:
      "Path to a system Chromium binary for PDF export (optional; omit to use Puppeteer's bundled browser)",
    group: 'PDF Export',
  },

  // Mastra / import models catalog
  IMPORT_MODELS_CATALOG_SOURCE: {
    required: false,
    description:
      'Set to "static" to use the bundled catalog; leave unset to fetch from Mastra\'s model gateway',
    group: 'AI / PDF Import',
  },

  // MCP server
  MCP_KEY_PEPPER: {
    required: true,
    secret: true,
    description:
      'HMAC pepper for MCP API key hashing (auto-generated if absent in interactive mode). Changing it invalidates existing MCP keys. When migrating from Supabase without MCP_KEY_PEPPER, set it to the old SUPABASE_SERVICE_ROLE_KEY to keep existing keys.',
    group: 'MCP Server',
  },
  MCP_SERVER_ENABLED: {
    required: false,
    description: 'Enable the MCP server (default true; set to false to disable)',
    group: 'MCP Server',
    default: 'true',
  },
  MCP_EXPORT_TTL_SECONDS: {
    required: false,
    description: 'Presigned-URL TTL for MCP CV export in seconds (default 3600)',
    group: 'MCP Server',
    default: '3600',
  },
  MCP_EXPORT_MAX_BYTES: {
    required: false,
    description: 'Maximum file size for MCP export in bytes (default 10 MiB)',
    group: 'MCP Server',
    default: '10485760',
  },

  // Runtime
  NODE_ENV: {
    required: false,
    description: 'Node environment (default production in Docker)',
    group: 'Runtime',
  },

  // Generator-internal target selector. Switches the public-URL
  // placeholder template that serializeToDotenv writes. Not a runtime
  // key — never appears in apps/{api,web}/.env.example.
  DEPLOY_TARGET: {
    required: false,
    description:
      'Generator-internal target selector. Allowed values: "docker-compose" (default) or "railway". Switches the public-URL placeholder template.',
    group: 'Generator',
  },
};

/** Secrets the interactive generator creates when absent. */
export const GENERATED_SECRET_KEYS = /** @type {const} */ ([
  'BETTER_AUTH_SECRET',
  'MCP_KEY_PEPPER',
  'AI_AGENT_ENCRYPTION_KEY',
]);

/** Output sections of `.env.prod`, in order. */
export const SERIALIZE_GROUPS = [
  { title: 'Database', keys: ['DATABASE_URL', 'DATABASE_POOL_MAX'] },
  {
    title: 'Object storage (S3 API)',
    keys: [
      'S3_ENDPOINT',
      'S3_PUBLIC_ENDPOINT',
      'S3_REGION',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_FORCE_PATH_STYLE',
      'S3_AUTO_CREATE_BUCKETS',
      'MEDIA_BUCKET',
      'MCP_EXPORT_BUCKET',
    ],
  },
  {
    title: 'Email (SMTP)',
    keys: [
      'SMTP_URL',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'MAIL_FROM',
      'APP_NAME',
    ],
  },
  {
    title: 'Server (NestJS API)',
    keys: ['PORT', 'CORS_ORIGIN', 'APP_URL', 'WEB_URL', 'PUBLIC_API_URL'],
  },
  {
    title: 'Auth (Better Auth)',
    keys: [
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'AUTH_FORGOT_PASSWORD_ENABLED',
      'AUTH_EMAIL_VERIFICATION_ENABLED',
      'AUTH_PASSWORDLESS_ENABLED',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET',
    ],
  },
  {
    title: 'Web (Next.js)',
    keys: [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED',
      'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED',
      'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED',
      'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED',
      'NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED',
      'NEXT_PUBLIC_AUTH_LINKEDIN_OAUTH_ENABLED',
    ],
  },
  {
    title: 'AI / PDF Import',
    keys: [
      'AI_AGENT_ENCRYPTION_KEY',
      'IMPORT_LLM_CONFIG_ENCRYPTION_KEY',
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
  { title: 'Runtime', keys: ['NODE_ENV'] },
];

const REQUIRED_KEYS = Object.entries(MANIFEST_SCHEMA)
  .filter(([, v]) => v.required)
  .map(([k]) => k);

const ALL_KEYS = Object.keys(MANIFEST_SCHEMA);

/**
 * Parse a raw JSON string into a manifest object.
 * @param {string} text
 * @returns {{ manifest: Record<string,string>, parseError: string | null }}
 */
export function parseManifest(text) {
  if (!text?.trim()) {
    return { manifest: {}, parseError: null };
  }
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { manifest: {}, parseError: 'Manifest must be a JSON object.' };
    }
    // Coerce any numeric values to strings (JSON manifest often has port numbers as numbers)
    /** @type {Record<string,string>} */
    const stringified = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number') {
        stringified[String(k)] = String(v);
      } else if (typeof v === 'string') {
        stringified[String(k)] = v;
      } else if (v === null || v === undefined) {
        stringified[String(k)] = '';
      } else {
        stringified[String(k)] = String(v);
      }
    }
    return { manifest: stringified, parseError: null };
  } catch (err) {
    return {
      manifest: {},
      parseError: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * @typedef {object} ValidateOptions
 * @property {boolean} [allowPlaceholders=false]  Allow placeholder values (for --force flag)
 */

/**
 * Validate a manifest object against the schema.
 *
 * @param {Record<string,string>} manifest
 * @param {ValidateOptions} [opts]
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateManifest(manifest, opts = {}) {
  const { allowPlaceholders = false } = opts;
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  // 1. Check required keys
  for (const key of REQUIRED_KEYS) {
    const value = manifest[key];
    if (value === undefined || value === '') {
      errors.push(`Missing required key: ${key}`);
    }
  }

  // 2. Check for \r (Windows line endings in values)
  for (const [key, value] of Object.entries(manifest)) {
    if (value.includes('\r')) {
      errors.push(`Value for ${key} contains a carriage return (\\r) — remove before writing.`);
    }
    if (value.includes('\0')) {
      errors.push(`Value for ${key} contains a NUL byte.`);
    }
  }

  // 3. Placeholder guard (only for AI_AGENT_ENCRYPTION_KEY and legacy alias)
  {
    const encKey = manifest.AI_AGENT_ENCRYPTION_KEY ?? manifest.IMPORT_LLM_CONFIG_ENCRYPTION_KEY;
    if (encKey !== undefined && encKey !== '') {
      if (encKey === PLACEHOLDER && !allowPlaceholders) {
        errors.push(
          `AI_AGENT_ENCRYPTION_KEY is still the placeholder "${PLACEHOLDER}" — generate a real key or pass --force to override.`,
        );
      }
      // Also check legacy alias if it was used
      const legacyEncKey = manifest.IMPORT_LLM_CONFIG_ENCRYPTION_KEY;
      if (
        legacyEncKey === PLACEHOLDER &&
        !allowPlaceholders &&
        manifest.AI_AGENT_ENCRYPTION_KEY === undefined
      ) {
        errors.push(
          `IMPORT_LLM_CONFIG_ENCRYPTION_KEY is still the placeholder "${PLACEHOLDER}" — generate a real key or pass --force to override.`,
        );
      }
    }
  }

  // 4. Email delivery needs an SMTP server
  if (!manifest.SMTP_URL && !manifest.SMTP_HOST) {
    errors.push(
      'Configure SMTP: set SMTP_URL, or SMTP_HOST (plus SMTP_PORT/SMTP_USER/SMTP_PASSWORD).',
    );
  }

  // 5. Session signing secret strength
  const authSecret = manifest.BETTER_AUTH_SECRET;
  if (authSecret && authSecret.length < 32 && !allowPlaceholders) {
    errors.push('BETTER_AUTH_SECRET must be at least 32 characters.');
  }

  // 6. Warn about unknown keys (they pass through silently)
  for (const key of Object.keys(manifest)) {
    if (!ALL_KEYS.includes(key)) {
      warnings.push(`Unknown key in manifest: ${key} — this will be written as-is to .env.prod.`);
    }
  }

  // 7. Validate DEPLOY_TARGET against the closed set
  if (manifest.DEPLOY_TARGET !== undefined && manifest.DEPLOY_TARGET !== '') {
    if (!ALLOWED_DEPLOY_TARGETS.includes(manifest.DEPLOY_TARGET)) {
      errors.push(
        `DEPLOY_TARGET value "${manifest.DEPLOY_TARGET}" is not supported. Supported targets: ${ALLOWED_DEPLOY_TARGETS.join(', ')}.`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Fill absent optional keys with their schema defaults.
 * Does NOT overwrite keys that are already present (even if empty string).
 *
 * @param {Record<string,string>} manifest
 * @returns {{ manifest: Record<string,string>, appliedDefaults: Set<string> }}
 */
export function applyDefaults(manifest) {
  /** @type {Set<string>} */
  const appliedDefaults = new Set();
  for (const [key, schema] of Object.entries(MANIFEST_SCHEMA)) {
    if (schema.default !== undefined) {
      if (manifest[key] === undefined || manifest[key] === '') {
        manifest[key] = schema.default;
        appliedDefaults.add(key);
      }
    }
  }
  return { manifest, appliedDefaults };
}

/**
 * The four public-URL keys whose placeholder template depends on
 * the deploy target. The docker compose target uses
 * `http://localhost:...` placeholders (the operator provides real
 * values via the manifest); the Railway target bakes in the
 * production custom domains (`app.resubuild.dev` for the web
 * app, `api.resubuild.com` for the API) so the generated
 * `.env.prod` is immediately deployable without a find-and-replace
 * step. The operator may still override these values via the
 * manifest — the manifest always wins.
 */
const TARGETED_PUBLIC_URL_KEYS = [
  'CORS_ORIGIN',
  'APP_URL',
  'PUBLIC_API_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_URL',
];

/**
 * @param {"docker-compose"|"railway"} target
 * @returns {Record<string,string>}
 */
function defaultsForTarget(target) {
  if (target === 'railway') {
    return {
      CORS_ORIGIN: 'https://app.resubuild.dev',
      APP_URL: 'https://app.resubuild.dev',
      PUBLIC_API_URL: 'https://api.resubuild.dev',
      NEXT_PUBLIC_API_URL: 'https://api.resubuild.dev',
      NEXT_PUBLIC_APP_URL: 'https://app.resubuild.dev',
    };
  }
  // docker-compose (default) — leave the operator's manifest values
  // untouched, but apply the historical localhost defaults for empty
  // values so the generated file is at least usable for a smoke check.
  return {
    CORS_ORIGIN: 'http://localhost:3000',
    APP_URL: 'http://localhost:3000',
    PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  };
}

/**
 * Resolve the target to use. The manifest's DEPLOY_TARGET wins over
 * the CLI-supplied default. An empty or missing DEPLOY_TARGET falls
 * back to the CLI default. An unknown DEPLOY_TARGET is left for
 * validateManifest to reject; resolveTarget returns the CLI default
 * in that case so the caller can decide how to report it.
 *
 * @param {Record<string,string>} manifest
 * @param {"docker-compose"|"railway"} [cliTarget="docker-compose"]
 * @returns {"docker-compose"|"railway"}
 */
export function resolveTarget(manifest, cliTarget = 'docker-compose') {
  const fromManifest = manifest?.DEPLOY_TARGET;
  if (fromManifest !== undefined && fromManifest !== '') {
    if (ALLOWED_DEPLOY_TARGETS.includes(/** @type {any} */ (fromManifest))) {
      return /** @type {any} */ (fromManifest);
    }
  }
  return cliTarget;
}

/**
 * Serialize a manifest to dotenv format with grouping and description comments.
 *
 * @param {Record<string,string>} manifest  Manifest after validation
 * @param {{
 *   generatedKeys?: Set<string>,
 *   placeholderKeys?: Set<string>,
 *   target?: "docker-compose"|"railway",
 *   emitTargetReminder?: boolean,
 * }} [extras]
 * @returns {string}
 */
export function serializeToDotenv(manifest, extras = {}) {
  const {
    generatedKeys = new Set(),
    placeholderKeys = new Set(),
    target = 'docker-compose',
    emitTargetReminder = true,
  } = extras;

  // Apply target-aware defaults for the four public-URL keys ONLY if
  // the manifest does not supply a real value. The manifest always
  // wins — defaults are just placeholders for the operator to
  // find-and-replace.
  const targetDefaults = defaultsForTarget(target);
  const resolved = { ...manifest };
  for (const key of TARGETED_PUBLIC_URL_KEYS) {
    if (resolved[key] === undefined || resolved[key] === '') {
      resolved[key] = targetDefaults[key];
    }
  }

  const groups = SERIALIZE_GROUPS;

  /** @type {string[]} */
  const lines = [
    '# Generated by scripts/setup-prod-env.mjs — do not commit to version control.',
    '# See README.md "Deploy" for documentation.',
    '',
  ];

  for (const group of groups) {
    const groupKeys = group.keys.filter((k) => resolved[k] !== undefined && resolved[k] !== '');
    if (groupKeys.length === 0) continue;

    lines.push(`# ── ${group.title} ──`);

    for (const key of groupKeys) {
      const schema = MANIFEST_SCHEMA[key];
      if (schema) {
        lines.push(`# ${schema.description}`);
      }
      const value = resolved[key];

      if (placeholderKeys.has(key)) {
        lines.push(`${key}=${value}  # ⚠ placeholder — replace with a real value`);
      } else if (generatedKeys.has(key)) {
        lines.push(`${key}=${value}  # auto-generated (can be rotated at any time)`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    lines.push('');
  }

  if (emitTargetReminder && target === 'railway') {
    lines.push(
      '# Railway target: the four public-URL keys above (CORS_ORIGIN, APP_URL,',
      '# PUBLIC_API_URL, NEXT_PUBLIC_API_URL) default to the production',
      '# custom domains (app.resubuild.dev for the web app,',
      '# api.resubuild.dev for the API). If your Railway-printed public',
      '# domain differs, update these values to match the actual',
      '# deployed URL for each service before re-running pnpm setup:env:prod.',
      '',
    );
  }

  return lines.join('\n');
}
