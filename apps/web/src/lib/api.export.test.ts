import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getValidAccessTokenMock } = vi.hoisted(() => ({
  getValidAccessTokenMock: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/lib/auth-session', () => ({
  getValidAccessToken: getValidAccessTokenMock,
}));

import { downloadCvPdf, getCvExportHtml } from './api';

describe('cv export api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getValidAccessTokenMock.mockResolvedValue('test-token');
  });

  it('getCvExportHtml fetches authenticated html export', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body>Jane</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    const html = await getCvExportHtml('cv-1');
    expect(html).toContain('Jane');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/export/html',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('downloadCvPdf returns blob and parsed filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF'], { type: 'application/pdf' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="jane-doe.pdf"',
        },
      }),
    );

    const result = await downloadCvPdf('cv-1');
    expect(result.filename).toBe('jane-doe.pdf');
    expect(result.blob.type).toBe('application/pdf');
  });
});
