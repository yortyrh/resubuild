'use client';

import { type CvTemplatePresentationConfig, renderResumeHtml } from '@resumind/resume-template';
import type { CvTitleBasics, Resume } from '@resumind/types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { memo, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CvEditorBreadcrumb } from '@/components/cv/cv-editor-breadcrumb';
import { TemplateConfigPanel } from '@/components/cv/template-config-panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type CvTemplateMeta,
  downloadCvPdf,
  getCv,
  getCvExportHtml,
  getCvTemplatePresentation,
  listCvTemplates,
  updateCvTemplate,
  updateCvTemplatePresentation,
} from '@/lib/api';
import { fetchCvResumeForPreview } from '@/lib/cv-preview-resume';
import { cn } from '@/lib/utils';
import {
  CV_PREVIEW_MIN_HEIGHT_PX,
  isCvPreviewResizeMessage,
  measureIframeDocumentHeight,
  withPreviewResizeReporter,
} from './cv-preview-frame';
import { CvPreviewBreadcrumbSkeleton, CvPreviewLoadingRow } from './cv-preview-skeleton';

interface CvPreviewClientProps {
  cvId: string;
}

type LayoutPanelState = 'auto' | 'collapsed' | 'expanded';

function resolveLayoutPanelState(userCollapsed: boolean | null): LayoutPanelState {
  if (userCollapsed === true) return 'collapsed';
  if (userCollapsed === false) return 'expanded';
  return 'auto';
}

function getAutoLayoutExpanded(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(min-width: 1024px)').matches;
}

const CvPreviewFrame = memo(function CvPreviewFrame({
  html,
  frameRef,
}: {
  html: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
}) {
  const [contentHeight, setContentHeight] = useState(CV_PREVIEW_MIN_HEIGHT_PX);
  const srcDoc = useMemo(() => withPreviewResizeReporter(html), [html]);

  const applyMeasuredHeight = useCallback((iframe: HTMLIFrameElement) => {
    const measured = measureIframeDocumentHeight(iframe);
    if (measured === null) {
      return;
    }
    setContentHeight(Math.max(CV_PREVIEW_MIN_HEIGHT_PX, Math.ceil(measured)));
  }, []);

  useEffect(() => {
    if (srcDoc) {
      setContentHeight(CV_PREVIEW_MIN_HEIGHT_PX);
    }
  }, [srcDoc]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const iframe = frameRef.current;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
        return;
      }
      if (!isCvPreviewResizeMessage(event.data)) {
        return;
      }
      setContentHeight(Math.max(CV_PREVIEW_MIN_HEIGHT_PX, Math.ceil(event.data.height)));
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef]);

  const handleLoad = useCallback(() => {
    const iframe = frameRef.current;
    if (!iframe) {
      return;
    }
    applyMeasuredHeight(iframe);
    window.setTimeout(() => applyMeasuredHeight(iframe), 300);
  }, [applyMeasuredHeight, frameRef]);

  const frameHeight = contentHeight;

  return (
    <div
      className="surface-soft cv-export-preview w-full min-w-0 max-w-none flex-1"
      style={{ height: frameHeight, minHeight: CV_PREVIEW_MIN_HEIGHT_PX }}
    >
      <iframe
        ref={frameRef}
        title="Resume preview"
        className="block w-full border-0 bg-white"
        style={{ height: frameHeight }}
        srcDoc={srcDoc}
        onLoad={handleLoad}
      />
    </div>
  );
});

function renderPreviewHtml(
  resume: Resume,
  templateId: string,
  config: CvTemplatePresentationConfig,
): string {
  return renderResumeHtml(resume, templateId, { presentationConfig: config });
}

const CvLayoutPanelColumn = memo(function CvLayoutPanelColumn({
  layoutPanelState,
  initialConfig,
  templateId,
  onConfigChange,
}: {
  layoutPanelState: LayoutPanelState;
  initialConfig: CvTemplatePresentationConfig;
  templateId: string;
  onConfigChange: (next: CvTemplatePresentationConfig) => void;
}) {
  return (
    <div
      className={cn(
        'shrink-0',
        layoutPanelState === 'auto' && 'hidden lg:block',
        layoutPanelState === 'collapsed' && 'hidden',
        layoutPanelState === 'expanded' && 'block',
      )}
    >
      <div className="sticky top-6">
        <TemplateConfigPanel
          key={templateId}
          id="cv-layout-panel"
          initialConfig={initialConfig}
          onChange={onConfigChange}
        />
      </div>
    </div>
  );
});

export function CvPreviewClient({ cvId }: CvPreviewClientProps) {
  const [layoutCollapsed, setLayoutCollapsed] = useState<boolean | null>(null);
  const layoutPanelState = resolveLayoutPanelState(layoutCollapsed);
  const [html, setHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [templates, setTemplates] = useState<CvTemplateMeta[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic');
  const [basics, setBasics] = useState<CvTitleBasics | null>(null);
  const [breadcrumbReady, setBreadcrumbReady] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [layoutInitialConfig, setLayoutInitialConfig] =
    useState<CvTemplatePresentationConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const resumeRef = useRef<Resume | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBreadcrumbReady(false);

    Promise.all([getCv(cvId), listCvTemplates()])
      .then(([cv, catalog]) => {
        if (cancelled) return;
        setTemplates(catalog);
        setSelectedTemplateId(cv.templateId ?? 'classic');
        const cvBasics = cv.data?.basics;
        setBasics(cvBasics && typeof cvBasics === 'object' ? (cvBasics as CvTitleBasics) : null);
      })
      .catch((err: Error) => {
        if (!cancelled) setTemplateError(err.message);
      })
      .finally(() => {
        if (!cancelled) setBreadcrumbReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const loadPresentation = useCallback(
    async (templateId: string) => {
      setConfigError(null);
      const result = await getCvTemplatePresentation(cvId, templateId);
      setLayoutInitialConfig(result.config);
      return result.config;
    },
    [cvId],
  );

  const loadHtmlFromServer = useCallback(
    async (templateId: string) => {
      setPreviewLoading(true);
      setError(null);
      try {
        const documentHtml = await getCvExportHtml(cvId, templateId);
        setHtml(documentHtml);
      } catch (err) {
        setHtml(null);
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setPreviewLoading(false);
      }
    },
    [cvId],
  );

  const applyPreviewConfig = useCallback(
    (templateId: string, config: CvTemplatePresentationConfig) => {
      const resume = resumeRef.current;
      if (!resume) return;
      setHtml(renderPreviewHtml(resume, templateId, config));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreview(templateId: string) {
      setPreviewLoading(true);
      setError(null);

      try {
        const [config, resume] = await Promise.all([
          loadPresentation(templateId),
          fetchCvResumeForPreview(cvId),
        ]);
        if (cancelled) return;

        resumeRef.current = resume;
        if (resume.basics) {
          setBasics(resume.basics);
        }
        setHtml(renderPreviewHtml(resume, templateId, config));
      } catch (err) {
        if (cancelled) return;
        resumeRef.current = null;
        setHtml(null);
        setError(err instanceof Error ? err.message : 'Failed to load preview');

        try {
          await loadHtmlFromServer(templateId);
        } catch {
          // loadHtmlFromServer sets error state
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void loadPreview(selectedTemplateId);

    return () => {
      cancelled = true;
    };
  }, [cvId, selectedTemplateId, loadPresentation, loadHtmlFromServer]);

  const templateOptions = useMemo(() => templates, [templates]);

  const handleTemplateChange = useCallback(
    async (nextTemplateId: string) => {
      setTemplateError(null);
      setSelectedTemplateId(nextTemplateId);
      try {
        await updateCvTemplate(cvId, nextTemplateId);
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : 'Failed to save template');
      }
    },
    [cvId],
  );

  const persistPresentation = useCallback(
    (next: CvTemplatePresentationConfig) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        setConfigError(null);
        updateCvTemplatePresentation(cvId, selectedTemplateId, next).catch((err: Error) =>
          setConfigError(err.message),
        );
      }, 400);
    },
    [cvId, selectedTemplateId],
  );

  const handlePresentationChange = useCallback(
    (next: CvTemplatePresentationConfig) => {
      applyPreviewConfig(selectedTemplateId, next);
      persistPresentation(next);
    },
    [applyPreviewConfig, persistPresentation, selectedTemplateId],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const toggleLayoutPanel = useCallback(() => {
    setLayoutCollapsed((current) => {
      if (current === null) {
        return getAutoLayoutExpanded();
      }

      return !current;
    });
  }, []);

  const handlePrint = useCallback(() => {
    const printWindow = previewFrameRef.current?.contentWindow;
    if (!printWindow) return;
    printWindow.focus();
    printWindow.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfError(null);
    setDownloading(true);
    try {
      const { blob, filename } = await downloadCvPdf(cvId, selectedTemplateId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'PDF download failed');
    } finally {
      setDownloading(false);
    }
  }, [cvId, selectedTemplateId]);

  return (
    <div className="space-y-4">
      {breadcrumbReady ? (
        <CvEditorBreadcrumb cvId={cvId} basics={basics} pageLabel="Preview" className="mt-0" />
      ) : (
        <CvPreviewBreadcrumbSkeleton />
      )}

      <div className="no-print flex flex-wrap items-end gap-4">
        <div className="min-w-[14rem] space-y-1">
          <Label htmlFor="cv-template-select">Template</Label>
          <select
            id="cv-template-select"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={selectedTemplateId}
            onChange={(event) => void handleTemplateChange(event.target.value)}
            disabled={templateOptions.length === 0}
          >
            {templateOptions.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="lg:hidden"
            onClick={toggleLayoutPanel}
            disabled={!layoutInitialConfig}
            aria-expanded={layoutPanelState === 'expanded'}
            aria-controls="cv-layout-panel"
            aria-label={layoutPanelState === 'expanded' ? 'Hide layout panel' : 'Show layout panel'}
          >
            {layoutPanelState === 'expanded' ? (
              <>
                <PanelLeftClose className="mr-1.5 size-4" aria-hidden="true" />
                Hide layout
              </>
            ) : (
              <>
                <PanelLeftOpen className="mr-1.5 size-4" aria-hidden="true" />
                Layout
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint} disabled={!html}>
            Print
          </Button>
          <Button type="button" onClick={handleDownloadPdf} disabled={!html || downloading}>
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={`/dashboard/cv/${cvId}`}>Back to editor</Link>
          </Button>
        </div>
      </div>

      {templateError ? <p className="no-print text-destructive text-sm">{templateError}</p> : null}
      {configError ? <p className="no-print text-destructive text-sm">{configError}</p> : null}
      {pdfError ? <p className="no-print text-destructive text-sm">{pdfError}</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}

      <div className="flex items-start gap-2">
        {previewLoading && !html && !error ? (
          <CvPreviewLoadingRow />
        ) : (
          <>
            {layoutInitialConfig ? (
              <CvLayoutPanelColumn
                layoutPanelState={layoutPanelState}
                initialConfig={layoutInitialConfig}
                templateId={selectedTemplateId}
                onConfigChange={handlePresentationChange}
              />
            ) : null}

            <div className="relative min-w-0 flex-1">
              {html ? <CvPreviewFrame html={html} frameRef={previewFrameRef} /> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
