import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_MAILPIT_URL, devMailpitUrl, isDevMailpitHintVisible } from './dev-mailpit';

describe('isDevMailpitHintVisible', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true for local development against the local mail catcher', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'http://127.0.0.1:54424');

    expect(isDevMailpitHintVisible()).toBe(true);
  });

  it('is false in production builds', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'http://127.0.0.1:54424');

    expect(isDevMailpitHintVisible()).toBe(false);
  });

  it('is false when the mail catcher URL is not local', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'https://mail.example.com');

    expect(isDevMailpitHintVisible()).toBe(false);
  });

  it('is false when ?hide-dev-banner=1 is in the URL', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', 'http://127.0.0.1:54424');

    // Simulate window.location.search = '?hide-dev-banner=1'
    vi.stubGlobal('window', {
      location: { search: '?hide-dev-banner=1' },
    });

    expect(isDevMailpitHintVisible()).toBe(false);
  });
});

describe('DEV_MAILPIT_URL', () => {
  it('defaults to the docker-compose.dev.yml Mailpit', () => {
    vi.stubEnv('NEXT_PUBLIC_DEV_MAILPIT_URL', '');
    expect(devMailpitUrl()).toBe('http://127.0.0.1:54424');
    vi.unstubAllEnvs();
    expect(typeof DEV_MAILPIT_URL).toBe('string');
  });
});
