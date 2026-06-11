import { describe, expect, it } from 'vitest';
import {
  composeApiEnv,
  composeSupabaseEnv,
  composeWebEnv,
  OPERATOR_CONTROLLED_KEYS,
  parseDotenv,
  readOperatorControlledValues,
  readOperatorControlledWebValues,
  readSupabaseOperatorControlledValues,
  SUPABASE_OPERATOR_CONTROLLED_KEYS,
  WEB_OPERATOR_CONTROLLED_KEYS,
} from './local-env-composer.mjs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** @returns {Parameters<typeof composeApiEnv>[0]} */
function makeBaseInput(overrides = {}) {
  return {
    apiUrl: 'http://127.0.0.1:54321',
    anonKey: 'anon-key',
    serviceRoleKey: 'service-role-key',
    jwtSecret: 'jwt-secret',
    cliPublishableKey: 'sb_publishable_from_cli',
    mediaBucket: 'media',
    mcpExportBucket: 'mcp-exports',
    port: '3001',
    corsOrigin: 'http://localhost:3000',
    publicApiUrl: 'http://localhost:3001',
    aiAgentEncryptionKey: 'encryption-key',
    pdfImportMaxBytes: '5242880',
    pdfImportEnabled: 'true',
    previousEnv: {},
    ...overrides,
  };
}

/** Extracts the value assigned to a single key in a dotenv body. */
function read(body, key) {
  const match = body.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1] : undefined;
}

// ---------------------------------------------------------------------------
// parseDotenv
// ---------------------------------------------------------------------------

describe('parseDotenv', () => {
  it('parses bare key=value lines', () => {
    const out = parseDotenv('FOO=bar\nBAZ=qux\n');
    expect(out).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('skips comment and blank lines', () => {
    const out = parseDotenv('# header\n\nFOO=bar\n# trailing\n');
    expect(out).toEqual({ FOO: 'bar' });
  });

  it('trims surrounding whitespace from values', () => {
    const out = parseDotenv('FOO=  bar  \nBAZ=\tqux\n');
    expect(out).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('handles values containing `=` (takes everything after the first)', () => {
    const out = parseDotenv('JWT=header.payload.sig\nNOTE=a=b=c\n');
    expect(out).toEqual({ JWT: 'header.payload.sig', NOTE: 'a=b=c' });
  });

  it('returns an empty object for null / undefined / empty input', () => {
    expect(parseDotenv(null)).toEqual({});
    expect(parseDotenv(undefined)).toEqual({});
    expect(parseDotenv('')).toEqual({});
  });

  it('skips lines without an `=` (e.g. malformed input)', () => {
    const out = parseDotenv('FOO=bar\nGARBAGE_LINE_NO_EQUALS\nBAZ=qux\n');
    expect(out).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });
});

// ---------------------------------------------------------------------------
// readOperatorControlledValues
// ---------------------------------------------------------------------------

describe('readOperatorControlledValues', () => {
  it('defaults every operator key to `false` when previousEnv is empty', () => {
    const out = readOperatorControlledValues({});
    for (const key of OPERATOR_CONTROLLED_KEYS) {
      expect(out[key]).toBe('false');
    }
  });

  it('preserves a previously-set `true` value (does NOT silently flip to false)', () => {
    const out = readOperatorControlledValues({
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
    });
    expect(out.AUTH_FORGOT_PASSWORD_ENABLED).toBe('true');
  });

  it('treats an empty string the same as missing (defensive default to false)', () => {
    const out = readOperatorControlledValues({
      AUTH_FORGOT_PASSWORD_ENABLED: '',
    });
    expect(out.AUTH_FORGOT_PASSWORD_ENABLED).toBe('false');
  });

  it('preserves `false` verbatim (does not omit the line)', () => {
    const out = readOperatorControlledValues({
      AUTH_FORGOT_PASSWORD_ENABLED: 'false',
    });
    expect(out.AUTH_FORGOT_PASSWORD_ENABLED).toBe('false');
  });

  it('exports only the server-side operator-controlled keys (the others live on the web side)', () => {
    // The api env now carries a single server-side flag — the
    // ForgotPasswordEnabledGuard still reads it. The other four
    // capability flags moved to the web side as NEXT_PUBLIC_*
    // mirrors (see readOperatorControlledWebValues below).
    expect(OPERATOR_CONTROLLED_KEYS).toEqual(['AUTH_FORGOT_PASSWORD_ENABLED']);
  });
});

describe('readOperatorControlledWebValues', () => {
  it('defaults every web-mirror key to `false` when previousWebEnv is empty', () => {
    const out = readOperatorControlledWebValues({});
    for (const key of WEB_OPERATOR_CONTROLLED_KEYS) {
      expect(out[key]).toBe('false');
    }
  });

  it('preserves a previously-set `true` value on the web mirror (re-run safety)', () => {
    const out = readOperatorControlledWebValues({
      NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED: 'true',
      NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED: 'true',
    });
    expect(out.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED).toBe('true');
    expect(out.NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED).toBe('true');
    expect(out.NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED).toBe('false');
  });

  it('treats an empty string the same as missing (defensive default to false)', () => {
    const out = readOperatorControlledWebValues({
      NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED: '',
    });
    expect(out.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED).toBe('false');
  });

  it('exports the full list of web-mirror keys (including the GitHub OAuth flag)', () => {
    expect(WEB_OPERATOR_CONTROLLED_KEYS).toEqual([
      'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED',
      'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED',
      'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED',
      'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED',
    ]);
  });
});

// ---------------------------------------------------------------------------
// composeApiEnv — the regression that motivated this module
// ---------------------------------------------------------------------------

describe('composeApiEnv — regression: re-running setup:env must not clobber operator config', () => {
  it('reproduces the BEFORE state: AUTH_FORGOT_PASSWORD_ENABLED is present and settable to true on first run', () => {
    const previousEnv = {
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_from_previous',
    };
    const body = composeApiEnv(makeBaseInput({ previousEnv }));

    expect(read(body, 'AUTH_FORGOT_PASSWORD_ENABLED')).toBe('true');
    expect(read(body, 'SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_from_cli');
  });

  it("reproduces the BUG: on a previous run that did NOT have the key, it falls back to false (matching the operator's first-run intent)", () => {
    const body = composeApiEnv(makeBaseInput({ previousEnv: {} }));
    expect(read(body, 'AUTH_FORGOT_PASSWORD_ENABLED')).toBe('false');
  });

  it('preserves AUTH_FORGOT_PASSWORD_ENABLED across a re-run where the CLI did not change (the original bug)', () => {
    // First run: operator enabled forgot-password.
    const first = composeApiEnv(
      makeBaseInput({
        previousEnv: {
          AUTH_FORGOT_PASSWORD_ENABLED: 'true',
        },
      }),
    );

    // Second run: read the first run's output back as `previousEnv` and re-run.
    const second = composeApiEnv(makeBaseInput({ previousEnv: parseDotenv(first) }));

    expect(read(second, 'AUTH_FORGOT_PASSWORD_ENABLED')).toBe('true');
  });

  it('does NOT emit the web-only capability flags (email-verification, passwordless)', () => {
    // These moved to the web env as NEXT_PUBLIC_* mirrors; the
    // server-side AuthConfigService Zod schema no longer reads them.
    const body = composeApiEnv(makeBaseInput());
    expect(body).not.toMatch(/^AUTH_EMAIL_VERIFICATION_ENABLED=/m);
    expect(body).not.toMatch(/^AUTH_PASSWORDLESS_ENABLED=/m);
    expect(body).not.toMatch(/^SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED=/m);
    expect(body).not.toMatch(/^SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=/m);
  });
});

// ---------------------------------------------------------------------------
// composeApiEnv — publishable key handling
// ---------------------------------------------------------------------------

describe('composeApiEnv — SUPABASE_PUBLISHABLE_KEY', () => {
  it('uses the value from the CLI when the CLI exposes it', () => {
    const body = composeApiEnv(makeBaseInput({ cliPublishableKey: 'sb_publishable_CLI' }));
    expect(read(body, 'SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_CLI');
  });

  it('falls back to the previous .env when the CLI does not expose a publishable key (older CLI versions)', () => {
    const body = composeApiEnv(
      makeBaseInput({
        cliPublishableKey: '',
        previousEnv: { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_OLD' },
      }),
    );
    expect(read(body, 'SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_OLD');
  });

  it('emits an empty string when neither the CLI nor the previous .env has a value (first run, old CLI)', () => {
    const body = composeApiEnv(makeBaseInput({ cliPublishableKey: '', previousEnv: {} }));
    // The line must still be present so the operator can see it and
    // know the API will fail to boot until they upgrade the CLI.
    expect(body).toMatch(/^SUPABASE_PUBLISHABLE_KEY=$/m);
  });
});

// ---------------------------------------------------------------------------
// composeApiEnv — CLI-derived keys
// ---------------------------------------------------------------------------

describe('composeApiEnv — CLI-derived keys are always refilled', () => {
  it('writes every CLI-derived key, even if the previous .env had a different value', () => {
    // Operator's previous .env had a stale API URL. The CLI just
    // regenerated keys after `supabase start`. The script must
    // overwrite the stale URL.
    const body = composeApiEnv(
      makeBaseInput({
        apiUrl: 'http://127.0.0.1:54321',
        previousEnv: { SUPABASE_URL: 'http://OLD.example.invalid' },
      }),
    );
    expect(read(body, 'SUPABASE_URL')).toBe('http://127.0.0.1:54321');
  });

  it('writes all expected CLI-derived keys', () => {
    const body = composeApiEnv(makeBaseInput());
    for (const key of [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_JWT_SECRET',
      'MEDIA_BUCKET',
      'MCP_EXPORT_BUCKET',
      'PORT',
      'CORS_ORIGIN',
      'APP_URL',
      'PUBLIC_API_URL',
      'AI_AGENT_ENCRYPTION_KEY',
      'PDF_IMPORT_MAX_BYTES',
      'PDF_IMPORT_ENABLED',
    ]) {
      expect(body).toMatch(new RegExp(`^${key}=`, 'm'));
    }
  });

  it('APP_URL and CORS_ORIGIN are written from the same input value', () => {
    const body = composeApiEnv(makeBaseInput({ corsOrigin: 'http://localhost:3000' }));
    expect(read(body, 'CORS_ORIGIN')).toBe('http://localhost:3000');
    expect(read(body, 'APP_URL')).toBe('http://localhost:3000');
  });
});

// ---------------------------------------------------------------------------
// composeWebEnv
// ---------------------------------------------------------------------------

/** @returns {Parameters<typeof composeWebEnv>[0]} */
function makeWebInput(overrides = {}) {
  return {
    publicApiUrl: 'http://localhost:3001',
    supabaseUrl: 'http://127.0.0.1:54321',
    cliPublishableKey: 'sb_publishable_TEST',
    previousEnv: {},
    ...overrides,
  };
}

describe('composeWebEnv', () => {
  it('writes the three NEXT_PUBLIC_* keys required by apps/web/src/lib/supabase/client.ts', () => {
    const body = composeWebEnv(makeWebInput());
    expect(read(body, 'NEXT_PUBLIC_API_URL')).toBe('http://localhost:3001');
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_URL')).toBe('http://127.0.0.1:54321');
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_TEST');
  });

  it('writes the four NEXT_PUBLIC_* auth capability mirrors (client-only feature flags)', () => {
    const body = composeWebEnv(makeWebInput());
    expect(read(body, 'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED')).toBe('false');
    expect(read(body, 'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED')).toBe('false');
    expect(read(body, 'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED')).toBe('false');
    expect(read(body, 'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED')).toBe('false');
  });

  it('preserves operator decisions on the web mirrors across a re-run', () => {
    const first = composeWebEnv(
      makeWebInput({
        previousEnv: {
          NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED: 'true',
          NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED: 'true',
          NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED: 'true',
        },
      }),
    );
    const second = composeWebEnv(makeWebInput({ previousEnv: parseDotenv(first) }));
    expect(read(second, 'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED')).toBe('true');
    expect(read(second, 'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED')).toBe('true');
    expect(read(second, 'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED')).toBe('false');
    expect(read(second, 'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED')).toBe('true');
  });

  it('does not leak the server-side auth keys (the SPA only sees the NEXT_PUBLIC_* mirrors)', () => {
    const body = composeWebEnv(makeWebInput());
    expect(body).not.toMatch(/^AUTH_/m);
    expect(body).not.toMatch(/^SUPABASE_AUTH_EXTERNAL_/m);
  });

  it('reproduces the BEFORE state: on a previous web .env that had a publishable key, the key is preserved when the CLI is empty', () => {
    // Operator manually filled in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    // once and the running CLI is too old to expose PUBLISHABLE_KEY.
    // The composer must NOT wipe the operator's value.
    const body = composeWebEnv(
      makeWebInput({
        cliPublishableKey: '',
        previousEnv: { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_KEPT' },
      }),
    );
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_KEPT');
  });

  it('reproduces the BUG: when the previous web .env had no publishable key and the CLI is empty, the line is empty (the SPA will fail to boot until the operator upgrades the CLI or fills the key)', () => {
    const body = composeWebEnv(makeWebInput({ cliPublishableKey: '', previousEnv: {} }));
    // The line must still be present so the operator can see it
    // instead of wondering why the SPA is broken.
    expect(body).toMatch(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$/m);
  });

  it('CLI value wins over the previous .env (same rule as the api side)', () => {
    const body = composeWebEnv(
      makeWebInput({
        cliPublishableKey: 'sb_publishable_NEW',
        previousEnv: { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_OLD' },
      }),
    );
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')).toBe('sb_publishable_NEW');
  });

  it('falls back to the documented local Supabase URL when the CLI is empty and the previous .env is empty', () => {
    const body = composeWebEnv(makeWebInput({ supabaseUrl: '', previousEnv: {} }));
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_URL')).toBe('http://127.0.0.1:54321');
  });

  it('preserves NEXT_PUBLIC_SUPABASE_URL across a re-run when the CLI exposes an empty value (defensive against partial status output)', () => {
    const body = composeWebEnv(
      makeWebInput({
        supabaseUrl: '',
        previousEnv: { NEXT_PUBLIC_SUPABASE_URL: 'http://custom.example.invalid' },
      }),
    );
    expect(read(body, 'NEXT_PUBLIC_SUPABASE_URL')).toBe('http://custom.example.invalid');
  });
});

// ---------------------------------------------------------------------------
// composeSupabaseEnv — writes the [auth.external.github] env stub to
// supabase/.env on first run. Re-runs preserve real operator values.
// ---------------------------------------------------------------------------

describe('readSupabaseOperatorControlledValues', () => {
  it('defaults both GitHub OAuth envs to the `github-oauth-stub` placeholder when previousSupabaseEnv is empty', () => {
    const out = readSupabaseOperatorControlledValues({});
    expect(out.GITHUB_OAUTH_CLIENT_ID).toBe('github-oauth-stub');
    expect(out.GITHUB_OAUTH_SECRET).toBe('github-oauth-stub');
  });

  it('preserves real operator-supplied credentials across a re-run (regression: never silently overwrite)', () => {
    const out = readSupabaseOperatorControlledValues({
      GITHUB_OAUTH_CLIENT_ID: 'Iv1.real_client_id',
      GITHUB_OAUTH_SECRET: 'a_real_github_oauth_secret',
    });
    expect(out.GITHUB_OAUTH_CLIENT_ID).toBe('Iv1.real_client_id');
    expect(out.GITHUB_OAUTH_SECRET).toBe('a_real_github_oauth_secret');
  });

  it('treats an empty string the same as missing (defensive default to stub)', () => {
    const out = readSupabaseOperatorControlledValues({
      GITHUB_OAUTH_CLIENT_ID: '',
    });
    expect(out.GITHUB_OAUTH_CLIENT_ID).toBe('github-oauth-stub');
  });

  it('exports the full list of supabase-side operator-controlled keys', () => {
    expect(SUPABASE_OPERATOR_CONTROLLED_KEYS).toEqual([
      'GITHUB_OAUTH_CLIENT_ID',
      'GITHUB_OAUTH_SECRET',
    ]);
  });
});

describe('composeSupabaseEnv', () => {
  it('writes both GITHUB_OAUTH_* keys as `github-oauth-stub` on first run', () => {
    const body = composeSupabaseEnv({ previousEnv: {} });
    expect(read(body, 'GITHUB_OAUTH_CLIENT_ID')).toBe('github-oauth-stub');
    expect(read(body, 'GITHUB_OAUTH_SECRET')).toBe('github-oauth-stub');
  });

  it('preserves operator credentials across a re-run (regression: never clobber)', () => {
    const first = composeSupabaseEnv({
      previousEnv: {
        GITHUB_OAUTH_CLIENT_ID: 'Iv1.real_client_id',
        GITHUB_OAUTH_SECRET: 'a_real_github_oauth_secret',
      },
    });
    const second = composeSupabaseEnv({ previousEnv: parseDotenv(first) });
    expect(read(second, 'GITHUB_OAUTH_CLIENT_ID')).toBe('Iv1.real_client_id');
    expect(read(second, 'GITHUB_OAUTH_SECRET')).toBe('a_real_github_oauth_secret');
  });

  it('emits a header comment that documents the non-functional stub', () => {
    const body = composeSupabaseEnv({ previousEnv: {} });
    // Operators SHOULD see at a glance that the stubs are placeholders,
    // not real credentials, so they know to replace them to go live.
    expect(body).toMatch(/NON-FUNCTIONAL/i);
    expect(body).toMatch(/GITHUB_OAUTH_/);
  });
});
