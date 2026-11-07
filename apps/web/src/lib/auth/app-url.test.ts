// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authCallbackUrl, getAppUrl, resetPasswordCallbackUrl } from './app-url';

/**
 * The public origin for the SPA, used to build OAuth and password-reset
 * redirect URLs. In a browser it is always the origin the user is on, so the
 * same build can be served from several domains (REQ-AUTH-011). The
 * build-time NEXT_PUBLIC_APP_URL and the request origin are only fallbacks
 * where there is no browser origin (server rendering).
 */
function withBrowserOrigin(origin: string, run: () => void) {
  const originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, origin },
  });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  }
}

function withoutWindow(run: () => void) {
  vi.stubGlobal('window', undefined);
  try {
    run();
  } finally {
    vi.unstubAllGlobals();
  }
}

function restoreEnv(originalEnv: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!Object.hasOwn(originalEnv, key)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

describe('getAppUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => restoreEnv(originalEnv));

  it('in a browser, returns window.location.origin when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withBrowserOrigin('https://app.dev.local', () => {
      expect(getAppUrl()).toBe('https://app.dev.local');
    });
  });

  it('in a browser, returns window.location.origin even when NEXT_PUBLIC_APP_URL is set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.resubuild.dev';
    withBrowserOrigin('https://staging.example.com', () => {
      expect(getAppUrl()).toBe('https://staging.example.com');
    });
  });

  it('in a browser, keeps the port of the current origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.resubuild.dev';
    withBrowserOrigin('http://localhost:3000', () => {
      expect(getAppUrl()).toBe('http://localhost:3000');
    });
  });

  it('in a browser, ignores the caller-provided request origin', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withBrowserOrigin('https://app.dev.local', () => {
      expect(getAppUrl('http://localhost:8080')).toBe('https://app.dev.local');
    });
  });

  it('is pure: repeated calls return the same result', () => {
    withBrowserOrigin('https://app.dev.local', () => {
      expect(getAppUrl()).toBe(getAppUrl());
    });
  });

  it('on the server, returns NEXT_PUBLIC_APP_URL stripped of trailing slashes when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com//';
    withoutWindow(() => {
      expect(getAppUrl()).toBe('https://app.example.com');
    });
  });

  it('on the server, returns NEXT_PUBLIC_APP_URL as-is when it has no trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    withoutWindow(() => {
      expect(getAppUrl()).toBe('https://app.example.com');
    });
  });

  it('on the server, falls back to the caller-provided request origin when env var is unset', () => {
    // Simulates the /auth/callback route running server-side in a Docker
    // container where the request hits the Next.js server via the
    // internal port (e.g. http://localhost:8080) and the SPA is not in a
    // browser context. The route must pass `request.nextUrl.origin` so
    // local dev still works when NEXT_PUBLIC_APP_URL is empty.
    delete process.env.NEXT_PUBLIC_APP_URL;
    withoutWindow(() => {
      expect(getAppUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });
  });

  it('on the server, strips a trailing slash from the request origin', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withoutWindow(() => {
      expect(getAppUrl('http://localhost:8080/')).toBe('http://localhost:8080');
    });
  });

  it('on the server, NEXT_PUBLIC_APP_URL still takes precedence over request origin', () => {
    // Production: the env var is baked in at build time. Even though the
    // request origin is the internal container address, the public
    // origin wins.
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.resubuild.dev';
    withoutWindow(() => {
      expect(getAppUrl('http://localhost:8080')).toBe('https://app.resubuild.dev');
    });
  });

  it('on the server, treats a blank NEXT_PUBLIC_APP_URL as unset', () => {
    process.env.NEXT_PUBLIC_APP_URL = '   ';
    withoutWindow(() => {
      expect(getAppUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });
  });

  it('on the server with no env var and no request origin, returns empty string', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withoutWindow(() => {
      expect(getAppUrl()).toBe('');
    });
  });
});

describe('authCallbackUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => restoreEnv(originalEnv));

  it('in a browser, appends /auth/callback to the current origin, not the env URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    withBrowserOrigin('https://staging.example.com', () => {
      expect(authCallbackUrl()).toBe('https://staging.example.com/auth/callback');
    });
  });

  it('on the server, appends /auth/callback to the env URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    withoutWindow(() => {
      expect(authCallbackUrl()).toBe('https://app.example.com/auth/callback');
    });
  });

  it('on the server, strips trailing slash before appending', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    withoutWindow(() => {
      expect(authCallbackUrl()).toBe('https://app.example.com/auth/callback');
    });
  });

  it('on the server, falls back to the request origin when the env URL is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withoutWindow(() => {
      expect(authCallbackUrl('http://localhost:8080')).toBe('http://localhost:8080/auth/callback');
    });
  });
});

describe('resetPasswordCallbackUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => restoreEnv(originalEnv));

  it('in a browser, appends /reset-password to the current origin, not the env URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    withBrowserOrigin('https://staging.example.com', () => {
      expect(resetPasswordCallbackUrl()).toBe('https://staging.example.com/reset-password');
    });
  });

  it('on the server, appends /reset-password to the env URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    withoutWindow(() => {
      expect(resetPasswordCallbackUrl()).toBe('https://app.example.com/reset-password');
    });
  });

  it('on the server, strips trailing slash before appending', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    withoutWindow(() => {
      expect(resetPasswordCallbackUrl()).toBe('https://app.example.com/reset-password');
    });
  });

  it('on the server, falls back to the request origin when the env URL is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    withoutWindow(() => {
      expect(resetPasswordCallbackUrl('http://localhost:8080')).toBe(
        'http://localhost:8080/reset-password',
      );
    });
  });
});
