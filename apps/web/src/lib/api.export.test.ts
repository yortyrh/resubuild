import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getValidAccessTokenMock } = vi.hoisted(() => ({
  getValidAccessTokenMock: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/lib/auth-session', () => ({
  getValidAccessToken: getValidAccessTokenMock,
}));

import { downloadCvPdf, getCvExportHtml, listCvTemplates, updateCvTemplate } from './api';

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

  it('getCvExportHtml passes template query param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body>Alum</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await getCvExportHtml('cv-1', 'capd-alum');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/export/html?template=capd-alum',
      expect.any(Object),
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

  it('downloadCvPdf passes template query param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF'], { type: 'application/pdf' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="jane-doe.pdf"',
        },
      }),
    );

    await downloadCvPdf('cv-1', 'capd-global');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/cv/cv-1/export/pdf?template=capd-global',
      expect.any(Object),
    );
  });

  it('listCvTemplates fetches catalog', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          templates: [
            { id: 'mit-classic', label: 'MIT Classic', description: '', category: 'default' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const templates = await listCvTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].id).toBe('mit-classic');
  });

  it('updateCvTemplate patches templateId', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'cv-1',
          user_id: 'u1',
          title: 'Jane',
          templateId: 'capd-alum',
          data: {},
          created_at: 'c',
          updated_at: 'u',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await updateCvTemplate('cv-1', 'capd-alum');
    expect(result.templateId).toBe('capd-alum');
  });
});
