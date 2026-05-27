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
        json: async () => ({ item: { id: 'row-1', name: 'Acme' } }),
      }),
    );
  });

  it('PATCH basics sends basics payload', async () => {
    await patchCvBasics('cv-1', { name: 'Jane' });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/basics',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ basics: { name: 'Jane' } }),
      }),
    );
  });

  it('POST work sends work payload', async () => {
    await cvWorkApi.create('cv-1', { name: 'Acme' });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/work',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ work: { name: 'Acme' } }),
      }),
    );
  });

  it('surfaces generic error message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(cvWorkApi.delete('cv-1', '00000000-0000-4000-8000-000000000001')).rejects.toThrow(
      'Request failed (500)',
    );
  });
});
