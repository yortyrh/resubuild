import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateServerClient = vi.fn();
const mockCookiesGetAll = vi.fn();
const mockCookiesSet = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      getAll: mockCookiesGetAll,
      set: mockCookiesSet,
    }),
}));

import { getSupabaseServerClient } from './server';

const ORIGINAL_ENV = { ...process.env };

describe('getSupabaseServerClient', () => {
  beforeEach(() => {
    mockCreateServerClient.mockReset();
    mockCookiesGetAll.mockReset();
    mockCookiesSet.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('passes the public URL and publishable key to createServerClient', async () => {
    mockCreateServerClient.mockReturnValue({ auth: {} });
    mockCookiesGetAll.mockReturnValue([]);

    await getSupabaseServerClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_test',
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
  });

  it('exposes the request cookies to the SDK via getAll', async () => {
    const storedCookies = [
      { name: 'sb-127-auth-token', value: 'session' },
      { name: 'sb-127-auth-token-code-verifier', value: 'verifier' },
    ];
    mockCookiesGetAll.mockReturnValue(storedCookies);
    let capturedGetAll: (() => unknown) | undefined;
    mockCreateServerClient.mockImplementation(
      (_url, _key, options: { cookies: { getAll: () => unknown } }) => {
        capturedGetAll = options.cookies.getAll;
        return { auth: {} };
      },
    );

    await getSupabaseServerClient();

    expect(capturedGetAll).toBeDefined();
    expect(capturedGetAll!()).toEqual(storedCookies);
  });

  it('forwards setAll writes to the cookie store (Route Handler context)', async () => {
    mockCookiesGetAll.mockReturnValue([]);
    let capturedSetAll:
      | ((cookies: { name: string; value: string; options: unknown }[]) => Promise<void>)
      | undefined;
    mockCreateServerClient.mockImplementation(
      (_url, _key, options: { cookies: { setAll: typeof capturedSetAll } }) => {
        capturedSetAll = options.cookies.setAll;
        return { auth: {} };
      },
    );

    await getSupabaseServerClient();

    expect(capturedSetAll).toBeDefined();
    await capturedSetAll!([{ name: 'sb-127-auth-token', value: 'new', options: { path: '/' } }]);

    expect(mockCookiesSet).toHaveBeenCalledWith(
      'sb-127-auth-token',
      'new',
      expect.objectContaining({ path: '/' }),
    );
  });

  it('swallows errors when the cookie store is read-only (Server Component context)', async () => {
    // In a Server Component, `cookies().set` throws because the store is
    // read-only. The SDK still needs to operate, so setAll swallows the
    // error and lets the request continue.
    mockCookiesGetAll.mockReturnValue([]);
    mockCookiesSet.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler.');
    });
    let capturedSetAll:
      | ((cookies: { name: string; value: string; options: unknown }[]) => Promise<void>)
      | undefined;
    mockCreateServerClient.mockImplementation(
      (_url, _key, options: { cookies: { setAll: typeof capturedSetAll } }) => {
        capturedSetAll = options.cookies.setAll;
        return { auth: {} };
      },
    );

    await getSupabaseServerClient();

    expect(capturedSetAll).toBeDefined();
    await expect(
      capturedSetAll!([{ name: 'sb-127-auth-token', value: 'x', options: {} }]),
    ).resolves.toBeUndefined();
  });
});
