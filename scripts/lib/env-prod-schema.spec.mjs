import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MANIFEST_SCHEMA,
  parseManifest,
  resolveTarget,
  serializeToDotenv,
  validateManifest,
} from './env-prod-schema.mjs';

// ---------------------------------------------------------------------------
// parseManifest
// ---------------------------------------------------------------------------
describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const { manifest, parseError } = parseManifest('{"SUPABASE_URL":"https://x.supabase.co"}');
    expect(parseError).toBeNull();
    expect(manifest.SUPABASE_URL).toBe('https://x.supabase.co');
  });

  it('coerces numeric values to strings', () => {
    const { manifest, parseError } = parseManifest('{"PORT":3001}');
    expect(parseError).toBeNull();
    expect(manifest.PORT).toBe('3001');
  });

  it('returns empty manifest for empty string', () => {
    const { manifest, parseError } = parseManifest('');
    expect(parseError).toBeNull();
    expect(manifest).toEqual({});
  });

  it('returns empty manifest for whitespace-only string', () => {
    const { manifest, parseError } = parseManifest('  \n  ');
    expect(parseError).toBeNull();
    expect(manifest).toEqual({});
  });

  it('returns error for invalid JSON', () => {
    const { manifest, parseError } = parseManifest('{not json}');
    expect(parseError).toMatch(/Invalid JSON/);
    expect(manifest).toEqual({});
  });

  it('returns error when root is not an object', () => {
    const { manifest, parseError } = parseManifest('["array"]');
    expect(parseError).toMatch(/JSON object/);
    expect(manifest).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------
describe('validateManifest', () => {
  const FULL_VALID_MANIFEST = {
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IngiLCJyYW5rIjoiOSIsImlhdCI6MTYyMzQwNDAwMCwiZXhwIjoxOTM4OTgwMDAwfQ.123',
    SUPABASE_SERVICE_ROLE_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IngiLCJyYW5rIjoiOSIsImlhdCI6MTYyMzQwNDAwMCwiZXhwIjoxOTM4OTgwMDAwfQ.srv',
    MEDIA_BUCKET: 'media',
    MCP_EXPORT_BUCKET: 'mcp-exports',
    CORS_ORIGIN: 'https://app.example.com',
    APP_URL: 'https://app.example.com',
    PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    AI_AGENT_ENCRYPTION_KEY: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=',
  };

  it('passes a complete valid manifest', () => {
    const { valid, errors } = validateManifest(FULL_VALID_MANIFEST);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('fails when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    const manifest = { ...FULL_VALID_MANIFEST };
    delete manifest.SUPABASE_SERVICE_ROLE_KEY;
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(false);
    expect(errors).toContain('Missing required key: SUPABASE_SERVICE_ROLE_KEY');
  });

  it('fails when AI_AGENT_ENCRYPTION_KEY is placeholder without --force', () => {
    const manifest = {
      ...FULL_VALID_MANIFEST,
      AI_AGENT_ENCRYPTION_KEY: 'change-me-to-a-long-random-secret',
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('placeholder'))).toBe(true);
  });

  it('passes placeholder with allowPlaceholders=true', () => {
    const manifest = {
      ...FULL_VALID_MANIFEST,
      AI_AGENT_ENCRYPTION_KEY: 'change-me-to-a-long-random-secret',
    };
    const { valid, errors, warnings } = validateManifest(manifest, { allowPlaceholders: true });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('fails if a value contains \\r', () => {
    const manifest = {
      ...FULL_VALID_MANIFEST,
      SUPABASE_URL: 'https://x.supabase.co\r\nTRACE:',
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('\\r'))).toBe(true);
  });

  it('fails if a value contains NUL byte', () => {
    const manifest = {
      ...FULL_VALID_MANIFEST,
      SUPABASE_URL: 'https://x.supabase.co\0',
    };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('NUL'))).toBe(true);
  });

  it('warns about unknown keys', () => {
    const manifest = { ...FULL_VALID_MANIFEST, MY_WEIRD_KEY: 'value' };
    const { warnings } = validateManifest(manifest);
    expect(warnings.some((w) => w.includes('MY_WEIRD_KEY'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// serializeToDotenv
// ---------------------------------------------------------------------------
describe('serializeToDotenv', () => {
  it('serializes a valid manifest with group headers and description comments', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
      AI_AGENT_ENCRYPTION_KEY: 'generated-key',
    };
    const output = serializeToDotenv(manifest);
    expect(output).toContain('# ── Supabase ──');
    expect(output).toContain('SUPABASE_URL=https://x.supabase.co');
    expect(output).toContain('# Supabase project URL (from Project Settings → API)');
    expect(output).toContain('# Generated by scripts/setup-prod-env.mjs');
  });

  it('omits groups with no keys present', () => {
    const manifest = { SUPABASE_URL: 'https://x.supabase.co' };
    const output = serializeToDotenv(manifest);
    expect(output).not.toContain('# ── Storage ──');
    expect(output).toContain('# ── Supabase ──');
  });

  it('marks auto-generated keys with a comment', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      AI_AGENT_ENCRYPTION_KEY: 'gen',
    };
    const generated = new Set(['AI_AGENT_ENCRYPTION_KEY']);
    const output = serializeToDotenv(manifest, { generatedKeys: generated });
    expect(output).toContain('AI_AGENT_ENCRYPTION_KEY=gen  # auto-generated');
  });

  it('marks placeholder keys with a warning comment', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      AI_AGENT_ENCRYPTION_KEY: 'change-me-to-a-long-random-secret',
    };
    const placeholder = new Set(['AI_AGENT_ENCRYPTION_KEY']);
    const output = serializeToDotenv(manifest, { placeholderKeys: placeholder });
    expect(output).toContain('# ⚠ placeholder');
  });

  it('omits keys that are absent from the manifest', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
    };
    const output = serializeToDotenv(manifest);
    expect(output).not.toContain('AI_AGENT_ENCRYPTION_KEY');
    expect(output).not.toContain('MEDIA_BUCKET');
  });

  // Railway target support — the new --target flag and the
  // serializeToDotenv `target` option (see task 3.2). The four
  // public-URL keys are CORS_ORIGIN, APP_URL, PUBLIC_API_URL, and
  // NEXT_PUBLIC_API_URL. When target=railway and the manifest
  // leaves them empty, the generator bakes in the production
  // custom domains (app.resubuild.dev for the web app,
  // api.resubuild.dev for the API) so the file is immediately
  // deployable.
  it('writes the four public-URL keys with the production custom domains when target=railway', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      AI_AGENT_ENCRYPTION_KEY: 'gen',
    };
    const output = serializeToDotenv(manifest, { target: 'railway' });
    expect(output).toMatch(/^CORS_ORIGIN=https:\/\/app\.resubuild\.dev$/m);
    expect(output).toMatch(/^APP_URL=https:\/\/app\.resubuild\.dev$/m);
    expect(output).toMatch(/^PUBLIC_API_URL=https:\/\/api\.resubuild\.dev$/m);
    expect(output).toMatch(/^NEXT_PUBLIC_API_URL=https:\/\/api\.resubuild\.dev$/m);
    // No docker compose placeholders leak through.
    expect(output).not.toMatch(/^CORS_ORIGIN=http:\/\/localhost/m);
    expect(output).not.toMatch(/^APP_URL=http:\/\/localhost/m);
    expect(output).not.toMatch(/^PUBLIC_API_URL=http:\/\/localhost/m);
    expect(output).not.toMatch(/^NEXT_PUBLIC_API_URL=http:\/\/localhost/m);
    // The reminder block is included.
    expect(output).toContain('Railway target');
  });

  it('preserves the docker compose placeholders verbatim when target=docker-compose (regression guard)', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      AI_AGENT_ENCRYPTION_KEY: 'gen',
    };
    const outputDefault = serializeToDotenv(manifest);
    const outputExplicit = serializeToDotenv(manifest, { target: 'docker-compose' });
    expect(outputDefault).toBe(outputExplicit);
    // The docker compose placeholders (or empty values the manifest
    // provided) are preserved; no Railway domains leak in.
    expect(outputDefault).not.toContain('resubuild.dev');
    expect(outputDefault).not.toContain('Railway target');
  });

  it('manifest values for the four public-URL keys win over target defaults', () => {
    const manifest = {
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'srv',
      AI_AGENT_ENCRYPTION_KEY: 'gen',
      CORS_ORIGIN: 'https://my.example.com',
    };
    const output = serializeToDotenv(manifest, { target: 'railway' });
    expect(output).toMatch(/^CORS_ORIGIN=https:\/\/my\.example\.com$/m);
  });
});

// ---------------------------------------------------------------------------
// DEPLOY_TARGET validation — closed set of "docker-compose" | "railway"
// ---------------------------------------------------------------------------
describe('validateManifest DEPLOY_TARGET', () => {
  const FULL_VALID_MANIFEST = {
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IngiLCJyYW5rIjoiOSIsImlhdCI6MTYyMzQwNDAwMCwiZXhwIjoxOTM4OTgwMDAwfQ.123',
    SUPABASE_SERVICE_ROLE_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IngiLCJyYW5rIjoiOSIsImlhdCI6MTYyMzQwNDAwMCwiZXhwIjoxOTM4OTgwMDAwfQ.srv',
    MEDIA_BUCKET: 'media',
    MCP_EXPORT_BUCKET: 'mcp-exports',
    CORS_ORIGIN: 'https://app.example.com',
    APP_URL: 'https://app.example.com',
    PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    AI_AGENT_ENCRYPTION_KEY: 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=',
  };

  it('accepts DEPLOY_TARGET=railway', () => {
    const manifest = { ...FULL_VALID_MANIFEST, DEPLOY_TARGET: 'railway' };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('accepts DEPLOY_TARGET=docker-compose', () => {
    const manifest = { ...FULL_VALID_MANIFEST, DEPLOY_TARGET: 'docker-compose' };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects an unknown DEPLOY_TARGET with the supported-targets list in the error', () => {
    const manifest = { ...FULL_VALID_MANIFEST, DEPLOY_TARGET: 'vercel' };
    const { valid, errors } = validateManifest(manifest);
    expect(valid).toBe(false);
    const targetError = errors.find((e) => e.includes('DEPLOY_TARGET'));
    expect(targetError).toBeDefined();
    expect(targetError).toMatch(/docker-compose/);
    expect(targetError).toMatch(/railway/);
  });
});

// ---------------------------------------------------------------------------
// resolveTarget — manifest DEPLOY_TARGET wins over the CLI flag
// ---------------------------------------------------------------------------
describe('resolveTarget', () => {
  it('returns the CLI default when the manifest is silent', () => {
    expect(resolveTarget({}, 'docker-compose')).toBe('docker-compose');
    expect(resolveTarget({ DEPLOY_TARGET: '' }, 'docker-compose')).toBe('docker-compose');
    expect(resolveTarget({ DEPLOY_TARGET: undefined }, 'railway')).toBe('railway');
  });

  it('returns the manifest value when it is a known target', () => {
    expect(resolveTarget({ DEPLOY_TARGET: 'railway' }, 'docker-compose')).toBe('railway');
    expect(resolveTarget({ DEPLOY_TARGET: 'docker-compose' }, 'railway')).toBe('docker-compose');
  });

  it('falls back to the CLI flag when the manifest value is unknown', () => {
    expect(resolveTarget({ DEPLOY_TARGET: 'vercel' }, 'docker-compose')).toBe('docker-compose');
  });
});

// ---------------------------------------------------------------------------
// Drift test: every non-comment KEY= in the example files must be in the schema
// ---------------------------------------------------------------------------
describe('env-prod-schema drift detection', () => {
  /**
   * Extract non-comment KEY=value lines from a dotenv file.
   * @param {string} content
   * @returns {string[]}
   */
  function extractKeys(content) {
    return content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0].trim());
  }

  function readExampleFile(workspace, filename) {
    const root = process.cwd();
    const path = resolve(root, workspace, filename);
    return readFileSync(path, 'utf8');
  }

  it('every non-comment KEY in apps/api/.env.example is in MANIFEST_SCHEMA', () => {
    const content = readExampleFile('apps/api', '.env.example');
    const keys = extractKeys(content);
    const schemaKeySet = new Set(Object.keys(MANIFEST_SCHEMA));

    const missing = keys.filter(
      (k) => !schemaKeySet.has(k) && k !== 'IMPORT_LLM_CONFIG_ENCRYPTION_KEY',
    );
    expect(
      missing,
      `Keys in apps/api/.env.example not in MANIFEST_SCHEMA: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('every non-comment KEY in apps/web/.env.example is in MANIFEST_SCHEMA', () => {
    const content = readExampleFile('apps/web', '.env.example');
    const keys = extractKeys(content);
    const schemaKeySet = new Set(Object.keys(MANIFEST_SCHEMA));

    const missing = keys.filter((k) => !schemaKeySet.has(k));
    expect(
      missing,
      `Keys in apps/web/.env.example not in MANIFEST_SCHEMA: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('every required schema KEY is covered by at least one example file', () => {
    const requiredKeys = Object.entries(MANIFEST_SCHEMA)
      .filter(([, v]) => v.required)
      .map(([k]) => k);

    const apiContent = readExampleFile('apps/api', '.env.example');
    const webContent = readExampleFile('apps/web', '.env.example');
    const allExampleKeys = new Set([
      ...extractKeys(apiContent),
      ...extractKeys(webContent),
      // The generator also produces NEXT_PUBLIC_API_URL from the manifest; web/.env.example has it as a template
    ]);

    const missing = requiredKeys.filter((k) => !allExampleKeys.has(k));
    expect(
      missing,
      `Required schema keys not in any example file: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });
});
