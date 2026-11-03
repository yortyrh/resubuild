import { describe, expect, it } from 'vitest';
import { devInfra } from './dev-infra.mjs';
import {
  AUTH_FLAG_KEYS,
  composeApiEnv,
  composeWebEnv,
  parseDotenv,
  readOperatorValues,
  resolveSecrets,
  SECRET_KEYS,
} from './local-env-composer.mjs';

/** Extracts the value assigned to a single key in a dotenv body. */
function read(body, key) {
  const match = body.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1] : undefined;
}

function apiInput(overrides = {}) {
  return {
    infra: devInfra({}),
    port: '3001',
    webOrigin: 'http://localhost:3000',
    publicApiUrl: 'http://localhost:3001',
    pdfImportMaxBytes: '5242880',
    pdfImportEnabled: 'true',
    operator: readOperatorValues({}),
    secrets: {
      BETTER_AUTH_SECRET: 'auth-secret',
      MCP_KEY_PEPPER: 'pepper',
      AI_AGENT_ENCRYPTION_KEY: 'enc',
    },
    ...overrides,
  };
}

describe('parseDotenv', () => {
  it('ignores comments and blank lines and keeps values verbatim', () => {
    expect(parseDotenv('# c\n\nA=1\nB = two=2\nnoequals\n')).toEqual({ A: '1', B: 'two=2' });
    expect(parseDotenv(undefined)).toEqual({});
  });
});

describe('readOperatorValues', () => {
  it('defaults flags to false and OAuth credentials to empty', () => {
    const values = readOperatorValues({});
    for (const key of AUTH_FLAG_KEYS) expect(values[key]).toBe('false');
    expect(values.GITHUB_CLIENT_ID).toBe('');
  });

  it('preserves API values and falls back to legacy NEXT_PUBLIC_ web flags', () => {
    const values = readOperatorValues(
      { AUTH_FORGOT_PASSWORD_ENABLED: 'true', GITHUB_CLIENT_ID: 'gh', GITHUB_CLIENT_SECRET: 's' },
      { NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED: 'true' },
    );
    expect(values).toMatchObject({
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
      AUTH_PASSWORDLESS_ENABLED: 'true',
      AUTH_EMAIL_VERIFICATION_ENABLED: 'false',
      GITHUB_CLIENT_ID: 'gh',
      GITHUB_CLIENT_SECRET: 's',
    });
  });
});

describe('resolveSecrets', () => {
  it('generates missing and placeholder secrets once', () => {
    let n = 0;
    const { values, generated } = resolveSecrets(
      { AI_AGENT_ENCRYPTION_KEY: 'change-me-to-a-long-random-secret' },
      () => `gen-${++n}`,
    );
    expect(generated).toEqual([...SECRET_KEYS]);
    expect(values).toEqual({
      BETTER_AUTH_SECRET: 'gen-1',
      MCP_KEY_PEPPER: 'gen-2',
      AI_AGENT_ENCRYPTION_KEY: 'gen-3',
    });
  });

  it('keeps existing secrets, including the legacy IMPORT_LLM_CONFIG_ENCRYPTION_KEY', () => {
    const { values, generated } = resolveSecrets({
      BETTER_AUTH_SECRET: 'keep-auth',
      MCP_KEY_PEPPER: 'keep-pepper',
      IMPORT_LLM_CONFIG_ENCRYPTION_KEY: 'keep-enc',
    });
    expect(generated).toEqual([]);
    expect(values.AI_AGENT_ENCRYPTION_KEY).toBe('keep-enc');
  });

  it('generates high-entropy defaults', () => {
    const { values } = resolveSecrets({});
    expect(values.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(values.BETTER_AUTH_SECRET).not.toBe(values.MCP_KEY_PEPPER);
  });
});

describe('composeApiEnv', () => {
  it('points the API at the local Docker infrastructure', () => {
    const body = composeApiEnv(apiInput());
    expect(read(body, 'DATABASE_URL')).toBe(
      'postgresql://resubuild:resubuild@127.0.0.1:54432/resubuild',
    );
    expect(read(body, 'S3_ENDPOINT')).toBe('http://127.0.0.1:54490');
    expect(read(body, 'S3_FORCE_PATH_STYLE')).toBe('true');
    expect(read(body, 'MEDIA_BUCKET')).toBe('media');
    expect(read(body, 'MCP_EXPORT_BUCKET')).toBe('mcp-exports');
    expect(read(body, 'SMTP_HOST')).toBe('127.0.0.1');
    expect(read(body, 'SMTP_PORT')).toBe('54425');
    expect(read(body, 'BETTER_AUTH_URL')).toBe('http://localhost:3001');
    expect(read(body, 'WEB_URL')).toBe('http://localhost:3000');
    expect(body).not.toMatch(/SUPABASE/);
  });

  it('honours RESUBUILD_*_PORT overrides', () => {
    const body = composeApiEnv(apiInput({ infra: devInfra({ RESUBUILD_POSTGRES_PORT: '6000' }) }));
    expect(read(body, 'DATABASE_URL')).toContain('127.0.0.1:6000');
  });

  it('writes operator values and secrets verbatim', () => {
    const operator = readOperatorValues({
      AUTH_EMAIL_VERIFICATION_ENABLED: 'true',
      GOOGLE_CLIENT_ID: 'g-id',
      GOOGLE_CLIENT_SECRET: 'g-secret',
    });
    const body = composeApiEnv(apiInput({ operator }));
    expect(read(body, 'AUTH_EMAIL_VERIFICATION_ENABLED')).toBe('true');
    expect(read(body, 'GOOGLE_CLIENT_ID')).toBe('g-id');
    expect(read(body, 'BETTER_AUTH_SECRET')).toBe('auth-secret');
    expect(read(body, 'MCP_KEY_PEPPER')).toBe('pepper');
    expect(read(body, 'AI_AGENT_ENCRYPTION_KEY')).toBe('enc');
  });
});

describe('composeWebEnv', () => {
  it('mirrors the API flags and enables OAuth buttons only for configured providers', () => {
    const operator = readOperatorValues({
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
      GITHUB_CLIENT_ID: 'gh',
      GITHUB_CLIENT_SECRET: 'secret',
      GOOGLE_CLIENT_ID: 'only-id',
    });
    const body = composeWebEnv({
      publicApiUrl: 'http://localhost:3001',
      mailpitUrl: 'http://127.0.0.1:54424',
      operator,
    });

    expect(read(body, 'NEXT_PUBLIC_API_URL')).toBe('http://localhost:3001');
    expect(read(body, 'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED')).toBe('true');
    expect(read(body, 'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED')).toBe('false');
    expect(read(body, 'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED')).toBe('true');
    expect(read(body, 'NEXT_PUBLIC_AUTH_GOOGLE_OAUTH_ENABLED')).toBe('false');
    expect(read(body, 'NEXT_PUBLIC_DEV_MAILPIT_URL')).toBe('http://127.0.0.1:54424');
    expect(body).not.toMatch(/SUPABASE/);
  });
});
