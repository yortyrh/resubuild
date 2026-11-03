import type { ConfigService } from '@nestjs/config';
import { AuthConfigService } from './auth.config';

const SECRET = 'x'.repeat(40);

function service(env: Record<string, string | undefined>) {
  return new AuthConfigService({ get: (key: string) => env[key] } as unknown as ConfigService);
}

describe('AuthConfigService', () => {
  const base = { BETTER_AUTH_SECRET: SECRET, APP_URL: 'http://localhost:3000/' };

  it('derives URLs from APP_URL / PUBLIC_API_URL and strips trailing slashes', () => {
    const config = service({ ...base, PUBLIC_API_URL: 'https://api.example.com/' });
    expect(config.get('WEB_URL')).toBe('http://localhost:3000');
    expect(config.get('BETTER_AUTH_URL')).toBe('https://api.example.com');
  });

  it('prefers WEB_URL and BETTER_AUTH_URL, defaulting the API URL to localhost:PORT', () => {
    expect(
      service({ ...base, WEB_URL: 'https://app.test', BETTER_AUTH_URL: 'https://auth.test' }).get(
        'BETTER_AUTH_URL',
      ),
    ).toBe('https://auth.test');
    expect(service({ ...base, PORT: '4000' }).get('BETTER_AUTH_URL')).toBe('http://localhost:4000');
  });

  it('trusts the web origin plus CORS_ORIGIN entries, deduplicated', () => {
    expect(
      service({ ...base, CORS_ORIGIN: 'http://localhost:3000, https://other.test/' }).get(
        'TRUSTED_ORIGINS',
      ),
    ).toEqual(['http://localhost:3000', 'https://other.test']);
  });

  it('parses feature flags with the "true"/"false" convention (default false)', () => {
    const config = service({
      ...base,
      AUTH_FORGOT_PASSWORD_ENABLED: 'true',
      AUTH_PASSWORDLESS_ENABLED: 'yes',
    });
    expect(config.get('AUTH_FORGOT_PASSWORD_ENABLED')).toBe(true);
    expect(config.get('AUTH_PASSWORDLESS_ENABLED')).toBe(false);
    expect(config.get('AUTH_EMAIL_VERIFICATION_ENABLED')).toBe(false);
  });

  it('enables OAuth providers only when id and secret are both set', () => {
    const config = service({
      ...base,
      GITHUB_CLIENT_ID: 'id',
      GITHUB_CLIENT_SECRET: 'secret',
      GOOGLE_CLIENT_ID: 'only-id',
      LINKEDIN_CLIENT_ID: 'l',
      LINKEDIN_CLIENT_SECRET: ' ',
    });
    expect(config.enabledOAuthProviders()).toEqual(['github']);
    expect(
      service({
        ...base,
        GOOGLE_CLIENT_ID: 'g',
        GOOGLE_CLIENT_SECRET: 's',
        LINKEDIN_CLIENT_ID: 'l',
        LINKEDIN_CLIENT_SECRET: 's',
      }).enabledOAuthProviders(),
    ).toEqual(['google', 'linkedin']);
  });

  it('rejects a missing or short secret and a missing web URL', () => {
    expect(() => service({ APP_URL: 'http://x.test' }).get('WEB_URL')).toThrow(
      /Auth config validation failed/,
    );
    expect(() =>
      service({ APP_URL: 'http://x.test', BETTER_AUTH_SECRET: 'short' }).get('WEB_URL'),
    ).toThrow(/at least 32/);
    expect(() => service({ BETTER_AUTH_SECRET: SECRET }).get('WEB_URL')).toThrow();
  });

  it('caches the parsed config', () => {
    const env: Record<string, string | undefined> = { ...base };
    const config = service(env);
    expect(config.get('AUTH_FORGOT_PASSWORD_ENABLED')).toBe(false);
    env.AUTH_FORGOT_PASSWORD_ENABLED = 'true';
    expect(config.get('AUTH_FORGOT_PASSWORD_ENABLED')).toBe(false);
  });
});
