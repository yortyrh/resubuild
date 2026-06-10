import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthFeatures } from './api';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

describe('fetchAuthFeatures', () => {
  it('returns auth features when API responds 200', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        forgot_password: true,
        email_verification: false,
        passwordless: false,
        providers: ['github'],
      }),
    });

    const result = await fetchAuthFeatures();

    expect(result).toEqual({
      forgot_password: true,
      email_verification: false,
      passwordless: false,
      providers: ['github'],
    });
  });

  it('throws when API responds non-200', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchAuthFeatures()).rejects.toThrow('Failed to fetch auth features (500)');
  });

  it('includes all provider types in providers array', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        forgot_password: true,
        email_verification: true,
        passwordless: true,
        providers: ['github', 'google'],
      }),
    });

    const result = await fetchAuthFeatures();

    expect(result.providers).toContain('github');
    expect(result.providers).toContain('google');
  });
});
