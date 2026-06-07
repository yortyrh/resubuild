/**
 * Manifest schema for the release-1 production .env generator.
 *
 * Exposes three pure functions (no I/O) shared by:
 *   - scripts/setup-prod-env.mjs  (the script engine)
 *   - .cursor/skills/setup-prod-env/SKILL.md
 *   - .cursor/commands/setup-prod-env.md
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
  // Supabase — all required
  SUPABASE_URL: {
    required: true,
    description: 'Supabase project URL (from Project Settings → API)',
    group: 'Supabase',
  },
  SUPABASE_ANON_KEY: {
    required: true,
    description: 'Supabase anon/public key (from Project Settings → API)',
    group: 'Supabase',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    secret: true,
    description:
      'Supabase service role key (from Project Settings → API — server-only, never expose)',
    group: 'Supabase',
  },
  SUPABASE_JWT_SECRET: {
    required: false,
    description: 'Optional legacy JWT secret (Supabase Dashboard → Authentication → JWT Settings)',
    group: 'Supabase',
  },

  // Storage
  MEDIA_BUCKET: {
    required: true,
    description: 'Supabase Storage bucket name for resume media uploads',
    group: 'Storage',
  },
  MCP_EXPORT_BUCKET: {
    required: true,
    description: 'Supabase Storage bucket name for MCP export artifacts',
    group: 'Storage',
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
  PUBLIC_API_URL: {
    required: true,
    description: 'Public URL the API is reachable at (used in media src attributes)',
    group: 'Server',
  },

  // Web (Next.js)
  NEXT_PUBLIC_API_URL: {
    required: true,
    description:
      'Public API URL that the Next.js browser bundle calls (same as PUBLIC_API_URL in most setups)',
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
    required: false,
    secret: true,
    description:
      'HMAC pepper for MCP API key hashing (defaults to SUPABASE_SERVICE_ROLE_KEY when unset)',
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
    description: 'Signed-URL TTL for MCP CV export in seconds (default 3600)',
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

  // 4. Warn about unknown keys (they pass through silently)
  for (const key of Object.keys(manifest)) {
    if (!ALL_KEYS.includes(key)) {
      warnings.push(`Unknown key in manifest: ${key} — this will be written as-is to .env.prod.`);
    }
  }

  // 5. Validate DEPLOY_TARGET against the closed set
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
    {
      title: 'Storage',
      keys: ['MEDIA_BUCKET', 'MCP_EXPORT_BUCKET'],
    },
    {
      title: 'Server (NestJS API)',
      keys: ['PORT', 'CORS_ORIGIN', 'APP_URL', 'PUBLIC_API_URL'],
    },
    {
      title: 'Web (Next.js)',
      keys: ['NEXT_PUBLIC_API_URL'],
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
    {
      title: 'PDF Export (Chromium)',
      keys: ['CHROMIUM_EXECUTABLE_PATH'],
    },
    {
      title: 'MCP Server',
      keys: [
        'MCP_KEY_PEPPER',
        'MCP_SERVER_ENABLED',
        'MCP_EXPORT_TTL_SECONDS',
        'MCP_EXPORT_MAX_BYTES',
      ],
    },
    {
      title: 'Runtime',
      keys: ['NODE_ENV'],
    },
  ];

  /** @type {string[]} */
  const lines = [
    '# Generated by scripts/setup-prod-env.mjs — do not commit to version control.',
    '# See openspec/specs/prod-env-bootstrap-helper/spec.md for documentation.',
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
