import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_MAILPIT_URL, isDevMailpitHintVisible } from './dev-mailpit';

describe('isDevMailpitHintVisible', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true for local development against local Supabase', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');

    expect(isDevMailpitHintVisible()).toBe(true);
  });

  it('is false in production builds', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');

    expect(isDevMailpitHintVisible()).toBe(false);
  });

  it('is false when Supabase URL points to cloud', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');

    expect(isDevMailpitHintVisible()).toBe(false);
  });

  it('is false when ?hide-dev-banner=1 is in the URL', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');

    // Simulate window.location.search = '?hide-dev-banner=1'
    vi.stubGlobal('window', {
      location: { search: '?hide-dev-banner=1' },
    });

    expect(isDevMailpitHintVisible()).toBe(false);
  });
});

describe('DEV_MAILPIT_URL', () => {
  it('defaults to local Mailpit', () => {
    expect(DEV_MAILPIT_URL).toBe('http://127.0.0.1:54324');
  });
});
