// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getAuthFeatures } from './features';

/**
 * The client-only `getAuthFeatures` resolver reads the deployment's
 * auth capability flags directly from `process.env.NEXT_PUBLIC_*` —
 * the values are inlined by the Next.js bundler at build time, so
 * the SPA can render the right auth controls synchronously (no
 * `/auth/features` round-trip, no loading state, no layout shift).
 */
describe('getAuthFeatures', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(originalEnv, key)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('returns all-false defaults when no NEXT_PUBLIC_* env vars are set (defensive)', () => {
    for (const key of [
      'NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED',
      'NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED',
      'NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED',
      'NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED',
    ]) {
      delete process.env[key];
    }
    expect(getAuthFeatures()).toEqual({
      forgot_password: false,
      email_verification: false,
      passwordless: false,
      github_oauth: false,
    });
  });

  it('opts a single feature in when its NEXT_PUBLIC_* env var is the literal "true"', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'true';
    expect(getAuthFeatures().forgot_password).toBe(true);
  });

  it('treats "false" as off (does not accidentally opt in)', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'false';
    expect(getAuthFeatures().forgot_password).toBe(false);
  });

  it('treats an empty string the same as missing (defensive default to false)', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = '';
    expect(getAuthFeatures().forgot_password).toBe(false);
  });

  it('treats non-literal truthy values as off (avoids accidental enable)', () => {
    for (const truthyButInvalid of ['1', 'TRUE', 'True', ' yes ', 'on']) {
      process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = truthyButInvalid;
      expect(getAuthFeatures().forgot_password).toBe(false);
    }
  });

  it('returns a complete, well-typed object when every flag is opted in', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'true';
    process.env.NEXT_PUBLIC_AUTH_EMAIL_VERIFICATION_ENABLED = 'true';
    process.env.NEXT_PUBLIC_AUTH_PASSWORDLESS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED = 'true';

    expect(getAuthFeatures()).toEqual({
      forgot_password: true,
      email_verification: true,
      passwordless: true,
      github_oauth: true,
    });
  });

  it('parses the github_oauth flag with the same strict-true rules as the other three', () => {
    // Defaults to false when unset.
    delete process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED;
    expect(getAuthFeatures().github_oauth).toBe(false);

    // Literal "true" opts in.
    process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED = 'true';
    expect(getAuthFeatures().github_oauth).toBe(true);

    // "false", empty, and non-literal truthy values all coerce to false.
    for (const falsyButUnset of ['false', '', '1', 'TRUE', 'True', ' yes ', 'on']) {
      process.env.NEXT_PUBLIC_AUTH_GITHUB_OAUTH_ENABLED = falsyButUnset;
      expect(getAuthFeatures().github_oauth).toBe(false);
    }
  });

  it('is pure — repeated calls with the same env return the same result', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'true';
    const first = getAuthFeatures();
    const second = getAuthFeatures();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('reflects env mutations across calls (no internal cache; values are read on every call)', () => {
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'false';
    expect(getAuthFeatures().forgot_password).toBe(false);
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENABLED = 'true';
    expect(getAuthFeatures().forgot_password).toBe(true);
  });
});
