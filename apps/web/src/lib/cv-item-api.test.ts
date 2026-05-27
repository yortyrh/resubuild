import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-session', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('token'),
}));

import { cvWorkApi, patchCvBasics } from '@/lib/cv-item-api';

describe('cv-item-api', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ version: 'v1.0.1', item: { id: 'row-1', name: 'Acme' } }),
      }),
    );
  });

  it('PATCH basics sends basics payload and version', async () => {
    await patchCvBasics('cv-1', { name: 'Jane' }, 'v1.0.0');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/basics',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ basics: { name: 'Jane' }, version: 'v1.0.0' }),
      }),
    );
  });

  it('POST work sends work payload', async () => {
    await cvWorkApi.create('cv-1', { name: 'Acme' }, 'v1.0.0');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/work',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ work: { name: 'Acme' }, version: 'v1.0.0' }),
      }),
    );
  });

  it('maps 409 to reload guidance message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({}),
      }),
    );

    await expect(
      cvWorkApi.delete('cv-1', '00000000-0000-4000-8000-000000000001', 'v1.0.0'),
    ).rejects.toThrow('This CV was modified elsewhere. Reload the page and try again.');
  });
});
