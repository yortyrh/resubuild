// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { authCallbackUrl, getAppUrl, resetPasswordCallbackUrl } from './app-url';

/**
 * The public origin for the SPA, used to build Supabase OAuth redirectTo
 * values and emailRedirectTo values. Resolved from NEXT_PUBLIC_APP_URL at
 * build time with a fallback to window.location.origin for local dev.
 */
describe('getAppUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(originalEnv, key)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('returns NEXT_PUBLIC_APP_URL stripped of trailing slashes when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(getAppUrl()).toBe('https://app.example.com');
  });

  it('returns NEXT_PUBLIC_APP_URL as-is when no trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(getAppUrl()).toBe('https://app.example.com');
  });

  it('falls back to window.location.origin when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const originalOrigin = window.location.origin;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, origin: 'https://app.dev.local' },
    });
    try {
      expect(getAppUrl()).toBe('https://app.dev.local');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: originalOrigin },
      });
    }
  });

  it('takes precedence over window.location.origin when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.resubuild.dev';
    const originalOrigin = window.location.origin;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, origin: 'http://localhost:3000' },
    });
    try {
      expect(getAppUrl()).toBe('https://app.resubuild.dev');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: originalOrigin },
      });
    }
  });

  it('is pure — repeated calls return the same result', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    const first = getAppUrl();
    const second = getAppUrl();
    expect(first).toBe(second);
  });
});

describe('authCallbackUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(originalEnv, key)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('appends /auth/callback to the app URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(authCallbackUrl()).toBe('https://app.example.com/auth/callback');
  });

  it('strips trailing slash before appending', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(authCallbackUrl()).toBe('https://app.example.com/auth/callback');
  });
});

describe('resetPasswordCallbackUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!Object.hasOwn(originalEnv, key)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('appends /reset-password to the app URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(resetPasswordCallbackUrl()).toBe('https://app.example.com/reset-password');
  });

  it('strips trailing slash before appending', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(resetPasswordCallbackUrl()).toBe('https://app.example.com/reset-password');
  });
});
