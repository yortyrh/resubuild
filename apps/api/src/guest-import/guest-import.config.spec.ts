import { GuestImportConfig } from './guest-import.config';

const config = (env: Record<string, string>) =>
  new GuestImportConfig({ get: (key: string) => env[key] } as never);

describe('GuestImportConfig', () => {
  it('defaults to enabled with 3 imports per IP per day', () => {
    const value = config({});
    expect(value.enabled).toBe(true);
    expect(value.importsPerIpPerDay).toBe(3);
    expect(value.turnstileSecretKey).toBeUndefined();
  });

  it('reads the switch, limit and Turnstile keys', () => {
    const value = config({
      AI_GUEST_IMPORT_ENABLED: 'false',
      AI_GUEST_IMPORTS_PER_IP_PER_DAY: '10',
      TURNSTILE_SITE_KEY: 'site',
      TURNSTILE_SECRET_KEY: 'secret',
    });
    expect(value).toMatchObject({
      enabled: false,
      importsPerIpPerDay: 10,
      turnstileSiteKey: 'site',
      turnstileSecretKey: 'secret',
    });
  });

  it('requires both Turnstile keys together', () => {
    expect(() => config({ TURNSTILE_SITE_KEY: 'site' })).toThrow(/both TURNSTILE_SITE_KEY/);
  });
});
