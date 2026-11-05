import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GuestImportError,
  getGuestImportJob,
  getGuestImportStatus,
  startGuestFileImport,
  startGuestUrlImport,
} from './guest-import-api';

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe('guest import api', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('treats an unreachable API as a closed wizard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(getGuestImportStatus()).resolves.toEqual({ enabled: false });
  });

  it('sends the Turnstile token without a session and returns the guest token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ jobId: 'j1', guestToken: 'g1' }, 202));
    vi.stubGlobal('fetch', fetchMock);
    await expect(startGuestFileImport(new File(['x'], 'cv.pdf'), 'tok')).resolves.toEqual({
      kind: 'job',
      jobId: 'j1',
      guestToken: 'g1',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/public\/import\/file$/);
    expect(init.headers).toEqual({ 'cf-turnstile-response': 'tok' });
  });

  it('starts URL imports and reads jobs with the guest token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ kind: 'json', data: { basics: {} } }))
      .mockResolvedValueOnce(json({ status: 'running' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(startGuestUrlImport('https://x.test')).resolves.toEqual({
      kind: 'json',
      data: { basics: {} },
    });
    await getGuestImportJob('j/1', 'g1');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/public\/import\/jobs\/j%2F1$/);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ 'x-guest-import-token': 'g1' });
  });

  it('surfaces the API message, status and code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ message: 'Free import is not available', code: 'GUEST_IMPORT_UNAVAILABLE' }, 503),
        ),
    );
    const error = await startGuestUrlImport('https://x.test').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GuestImportError);
    expect(error).toMatchObject({
      message: 'Free import is not available',
      status: 503,
      code: 'GUEST_IMPORT_UNAVAILABLE',
    });
  });
});
