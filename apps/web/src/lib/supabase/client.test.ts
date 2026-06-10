import { afterEach, describe, expect, it } from 'vitest';
import { purgeSupabaseSessionCookies } from './client';

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/`;
};

const getCookieNames = () =>
  document.cookie
    .split(';')
    .map((raw) => raw.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name));

const clearAllCookies = () => {
  for (const name of getCookieNames()) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};

describe('purgeSupabaseSessionCookies', () => {
  afterEach(() => {
    clearAllCookies();
  });

  it('preserves the active PKCE code-verifier cookie (regression: #PKCE)', () => {
    // The cookie name matches what `@supabase/ssr` writes for a project with
    // ref `127` (e.g. local Supabase at http://127.0.0.1:54321).
    setCookie('sb-127-auth-token-code-verifier', 'base64-IjYxMjM0NTY3ODkw');

    purgeSupabaseSessionCookies();

    expect(getCookieNames()).toContain('sb-127-auth-token-code-verifier');
  });

  it('preserves chunked code-verifier variants', () => {
    setCookie('sb-127-auth-token-code-verifier.0', 'base64-chunk-a');
    setCookie('sb-127-auth-token-code-verifier.1', 'base64-chunk-b');

    purgeSupabaseSessionCookies();

    const names = getCookieNames();
    expect(names).toContain('sb-127-auth-token-code-verifier.0');
    expect(names).toContain('sb-127-auth-token-code-verifier.1');
  });

  it('drops stale session token cookies to prevent 431 errors', () => {
    setCookie('sb-127-auth-token', 'base64-session-payload');
    setCookie('sb-127-auth-token.0', 'base64-chunk');
    setCookie('sb-127-auth-token.1', 'base64-chunk');

    purgeSupabaseSessionCookies();

    const names = getCookieNames();
    expect(names).not.toContain('sb-127-auth-token');
    expect(names).not.toContain('sb-127-auth-token.0');
    expect(names).not.toContain('sb-127-auth-token.1');
  });

  it('leaves non-Supabase cookies alone', () => {
    setCookie('analytics-id', 'abc');
    setCookie('theme', 'dark');

    purgeSupabaseSessionCookies();

    const names = getCookieNames();
    expect(names).toContain('analytics-id');
    expect(names).toContain('theme');
  });
});
