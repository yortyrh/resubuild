'use client';

import { renderResumeHtml } from '@resubuild/resume-template';
import { useQuery } from '@tanstack/react-query';
import { getCvExportHtml, getCvTemplatePresentation } from '@/lib/api';
import { fetchCvResumeForPreview } from '@/lib/cv-preview-resume';

export interface CvPreviewHtmlState {
  html: string | null;
  loading: boolean;
  error: string | null;
}

/** Outside `cvKeys.detail` so CV base invalidations do not re-render every preview. */
export function cvPreviewHtmlKey(cvId: string, templateId: string) {
  return ['cv', 'preview-html', cvId, templateId] as const;
}

async function loadCvPreviewHtml(cvId: string, templateId: string): Promise<string> {
  try {
    const [{ config }, resume] = await Promise.all([
      getCvTemplatePresentation(cvId, templateId),
      fetchCvResumeForPreview(cvId),
    ]);
    return renderResumeHtml(resume, templateId, { presentationConfig: config });
  } catch {
    // Client render failed (presentation or resume): use the server-rendered export.
    return getCvExportHtml(cvId, templateId);
  }
}

/**
 * Renders a CV as the preview document HTML for `templateId`, with its saved
 * template presentation. Falls back to the server export HTML when the client
 * render cannot load its inputs. Idle while `cvId` or `templateId` is missing.
 */
export function useCvPreviewHtml(
  cvId: string | null | undefined,
  templateId: string | null | undefined,
): CvPreviewHtmlState {
  const enabled = Boolean(cvId && templateId);
  const query = useQuery({
    queryKey: cvPreviewHtmlKey(cvId ?? '', templateId ?? ''),
    queryFn: () => loadCvPreviewHtml(cvId!, templateId!),
    enabled,
  });

  if (!enabled) {
    return { html: null, loading: false, error: null };
  }

  return {
    html: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? query.error.message || 'Failed to load preview' : null,
  };
}
