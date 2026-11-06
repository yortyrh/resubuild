// @vitest-environment jsdom

import type { CvTemplatePresentationConfig } from '@resubuild/resume-template';
import type { Resume } from '@resubuild/types';
import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNoRetryTestQueryClient, renderHookWithQueryClient } from '@/lib/queries/test-utils';
import { useCvPreviewHtml } from './use-cv-preview-html';

vi.mock('@/lib/api', () => ({
  getCvTemplatePresentation: vi.fn(),
  getCvExportHtml: vi.fn(),
}));

vi.mock('@/lib/cv-preview-resume', () => ({
  fetchCvResumeForPreview: vi.fn(),
}));

vi.mock('@resubuild/resume-template', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@resubuild/resume-template')>();
  return {
    ...actual,
    renderResumeHtml: vi.fn(() => '<html><body>Rendered Jane</body></html>'),
  };
});

import { renderResumeHtml } from '@resubuild/resume-template';
import { getCvExportHtml, getCvTemplatePresentation } from '@/lib/api';
import { fetchCvResumeForPreview } from '@/lib/cv-preview-resume';

const config = {
  sectionOrder: ['work'],
  hiddenSections: [],
} as unknown as CvTemplatePresentationConfig;
const resume: Resume = { basics: { name: 'Jane Doe' } };

function renderPreviewHook(cvId: string | null | undefined, templateId: string | null | undefined) {
  return renderHookWithQueryClient(() => useCvPreviewHtml(cvId, templateId), {
    queryClient: createNoRetryTestQueryClient(),
  });
}

describe('useCvPreviewHtml', () => {
  beforeEach(() => {
    vi.mocked(getCvTemplatePresentation).mockResolvedValue({ templateId: 'modern', config });
    vi.mocked(fetchCvResumeForPreview).mockResolvedValue(resume);
    vi.mocked(getCvExportHtml).mockResolvedValue('<html><body>Server Jane</body></html>');
    vi.mocked(renderResumeHtml).mockReturnValue('<html><body>Rendered Jane</body></html>');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    [null, 'modern'],
    [undefined, 'modern'],
    ['', 'modern'],
    ['cv-1', null],
    ['cv-1', undefined],
    ['cv-1', ''],
  ])('stays idle when cvId is %j and templateId is %j', async (cvId, templateId) => {
    const { result } = renderPreviewHook(cvId, templateId);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(result.current).toEqual({ html: null, loading: false, error: null });
    expect(getCvTemplatePresentation).not.toHaveBeenCalled();
    expect(fetchCvResumeForPreview).not.toHaveBeenCalled();
    expect(getCvExportHtml).not.toHaveBeenCalled();
    expect(renderResumeHtml).not.toHaveBeenCalled();
  });

  it('reports loading while the preview is being fetched', () => {
    vi.mocked(getCvTemplatePresentation).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchCvResumeForPreview).mockReturnValue(new Promise(() => {}));

    const { result } = renderPreviewHook('cv-1', 'modern');

    expect(result.current.loading).toBe(true);
    expect(result.current.html).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('renders the resume with the saved presentation for the template', async () => {
    const { result } = renderPreviewHook('cv-1', 'modern');

    await waitFor(() => {
      expect(result.current.html).toBe('<html><body>Rendered Jane</body></html>');
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getCvTemplatePresentation).toHaveBeenCalledWith('cv-1', 'modern');
    expect(fetchCvResumeForPreview).toHaveBeenCalledWith('cv-1');
    expect(renderResumeHtml).toHaveBeenCalledWith(resume, 'modern', {
      presentationConfig: config,
    });
    expect(getCvExportHtml).not.toHaveBeenCalled();
  });

  it('falls back to the server export HTML when the presentation cannot be loaded', async () => {
    vi.mocked(getCvTemplatePresentation).mockRejectedValue(new Error('Presentation failed'));

    const { result } = renderPreviewHook('cv-1', 'modern');

    await waitFor(() => {
      expect(result.current.html).toBe('<html><body>Server Jane</body></html>');
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getCvExportHtml).toHaveBeenCalledWith('cv-1', 'modern');
    expect(renderResumeHtml).not.toHaveBeenCalled();
  });

  it('falls back to the server export HTML when the resume cannot be loaded', async () => {
    vi.mocked(fetchCvResumeForPreview).mockRejectedValue(new Error('Resume failed'));

    const { result } = renderPreviewHook('cv-1', 'classic');

    await waitFor(() => {
      expect(result.current.html).toBe('<html><body>Server Jane</body></html>');
    });
    expect(result.current.error).toBeNull();
    expect(getCvExportHtml).toHaveBeenCalledWith('cv-1', 'classic');
  });

  it('reports the error when the fallback export also fails', async () => {
    vi.mocked(getCvTemplatePresentation).mockRejectedValue(new Error('Presentation failed'));
    vi.mocked(getCvExportHtml).mockRejectedValue(new Error('Export unavailable'));

    const { result } = renderPreviewHook('cv-1', 'modern');

    await waitFor(() => {
      expect(result.current.error).toBe('Export unavailable');
    });
    expect(result.current.html).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
