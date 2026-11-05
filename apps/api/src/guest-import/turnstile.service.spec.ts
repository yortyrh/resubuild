import { TURNSTILE_VERIFY_URL, TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const service = (secret?: string) =>
    new TurnstileService({ turnstileSecretKey: secret } as never);

  it('accepts everything when not configured', async () => {
    await expect(service().verify(undefined)).resolves.toBe(true);
    expect(service().enabled).toBe(false);
  });

  it('rejects a missing token without calling Cloudflare', async () => {
    global.fetch = jest.fn() as never;
    await expect(service('secret').verify('  ')).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('verifies the token with the secret and client IP', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ json: async () => ({ success: true }) });
    global.fetch = fetchMock as never;
    await expect(service('secret').verify('tok', '1.2.3.4')).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    expect(String(init.body)).toBe('secret=secret&response=tok&remoteip=1.2.3.4');
  });

  it('rejects invalid tokens and network failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['bad'] }),
    }) as never;
    await expect(service('secret').verify('tok')).resolves.toBe(false);
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;
    await expect(service('secret').verify('tok')).resolves.toBe(false);
  });
});
