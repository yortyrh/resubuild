'use client';

import { type CvTemplatePresentationConfig, renderResumeHtml } from '@resubuild/resume-template';
import type { CvTitleBasics, Resume } from '@resubuild/types';
import { ArrowLeft, Braces, FileDown, PanelLeftClose, PanelLeftOpen, Printer } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CvApplicationEditorBreadcrumb } from '@/components/cv/cv-application-editor-breadcrumb';
import { CvEditorBreadcrumb } from '@/components/cv/cv-editor-breadcrumb';
import { CvPreviewIframe } from '@/components/cv/cv-preview-iframe';
import { TemplateConfigPanel } from '@/components/cv/template-config-panel';
import { useApplicationForCv } from '@/components/cv/use-application-for-cv';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  type CvTemplateMeta,
  downloadCvJson,
  downloadCvPdf,
  getCv,
  getCvExportHtml,
  getCvTemplatePresentation,
  listCvTemplates,
  updateCvTemplate,
  updateCvTemplatePresentation,
} from '@/lib/api';
import { fetchCvResumeForPreview } from '@/lib/cv-preview-resume';
import { CvPreviewBreadcrumbSkeleton, CvPreviewLoadingRow } from './cv-preview-skeleton';

interface CvPreviewClientProps {
  cvId: string;
}

function getAutoLayoutExpanded(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(min-width: 1024px)').matches;
}

const LG_BREAKPOINT_QUERY = '(min-width: 1024px)';

function getInlinePanelDisplayable(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(LG_BREAKPOINT_QUERY).matches;
}

/**
 * Tracks whether the viewport is wide enough to host the inline layout panel
 * (`>= lg` / 1024px). The desktop panel is hidden below this breakpoint via
 * Tailwind's `lg:block`, so on narrower viewports the toggle must drive the
 * mobile drawer instead — otherwise the button silently does nothing on
 * tablet-sized screens (768–1023px).
 */
function useInlineLayoutPanelDisplayable(): boolean {
  const [displayable, setDisplayable] = useState<boolean>(() => getInlinePanelDisplayable());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(LG_BREAKPOINT_QUERY);
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      setDisplayable(event.matches);
    };

    setDisplayable(mql.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }

    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return displayable;
}

function renderPreviewHtml(
  resume: Resume,
  templateId: string,
  config: CvTemplatePresentationConfig,
): string {
  return renderResumeHtml(resume, templateId, { presentationConfig: config });
}

export function CvPreviewClient({ cvId }: CvPreviewClientProps) {
  const application = useApplicationForCv(cvId);
  const inlinePanelDisplayable = useInlineLayoutPanelDisplayable();
  const [desktopPanelCollapsed, setDesktopPanelCollapsed] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktopPanelExpanded =
    desktopPanelCollapsed === null ? getAutoLayoutExpanded() : !desktopPanelCollapsed;
  const [html, setHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
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

  const backHref = application
    ? `/dashboard/applications/${application.id}`
    : `/dashboard/cv/${cvId}`;
  const backAriaLabel = application ? 'Back to application' : 'Back to editor';

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
    // Below the `lg` breakpoint the inline panel is hidden by Tailwind, so we
    // must drive the mobile drawer — otherwise the button is a no-op on
    // tablet-sized viewports (768–1023px).
    if (!inlinePanelDisplayable) {
      setDrawerOpen((open) => !open);
      return;
    }

    setDesktopPanelCollapsed((current) => {
      if (current === null) {
        return getAutoLayoutExpanded();
      }

      return !current;
    });
  }, [inlinePanelDisplayable]);

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

  const handleDownloadJson = useCallback(async () => {
    setJsonError(null);
    setDownloadingJson(true);
    try {
      const { blob, filename } = await downloadCvJson(cvId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'JSON download failed');
    } finally {
      setDownloadingJson(false);
    }
  }, [cvId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
        <div className="min-w-0 flex-1">
          {breadcrumbReady ? (
            application ? (
              <CvApplicationEditorBreadcrumb
                application={application}
                cvId={cvId}
                pageLabel="Preview"
                className="mt-0"
              />
            ) : (
              <CvEditorBreadcrumb
                cvId={cvId}
                basics={basics}
                pageLabel="Preview"
                className="mt-0"
              />
            )
          ) : (
            <CvPreviewBreadcrumbSkeleton />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="no-print shrink-0" asChild>
          <Link href={backHref} aria-label={backAriaLabel}>
            <ArrowLeft className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </Button>
      </div>

      <div className="no-print flex flex-wrap items-start gap-x-2 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={toggleLayoutPanel}
          disabled={!layoutInitialConfig}
          aria-expanded={inlinePanelDisplayable ? !desktopPanelCollapsed : drawerOpen}
          aria-controls={inlinePanelDisplayable ? 'cv-layout-panel' : 'cv-layout-panel-drawer'}
          aria-label={
            (inlinePanelDisplayable ? !desktopPanelCollapsed : drawerOpen)
              ? 'Hide layout panel'
              : 'Show layout panel'
          }
        >
          {(inlinePanelDisplayable ? !desktopPanelCollapsed : drawerOpen) ? (
            <>
              <PanelLeftClose className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Hide layout</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Layout</span>
            </>
          )}
        </Button>

        <div className="flex min-w-[12rem] flex-1 items-center gap-2 sm:min-w-[14rem]">
          <Label htmlFor="cv-template-select" className="hidden shrink-0 sm:inline">
            Template
          </Label>
          <select
            id="cv-template-select"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 min-w-0 flex-1 rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            value={selectedTemplateId}
            onChange={(event) => void handleTemplateChange(event.target.value)}
            disabled={templateOptions.length === 0}
            aria-label="Template"
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
            size="sm"
            className="shrink-0"
            onClick={handlePrint}
            disabled={!html}
            aria-label="Print"
          >
            <Printer className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleDownloadJson}
            disabled={!html || downloadingJson}
            aria-label={downloadingJson ? 'Downloading JSON Resume' : 'JSON Resume'}
          >
            <Braces className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">
              {downloadingJson ? 'Downloading…' : 'JSON Resume'}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={handleDownloadPdf}
            disabled={!html || downloading}
            aria-label={downloading ? 'Downloading PDF' : 'PDF'}
          >
            <FileDown className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">{downloading ? 'Downloading…' : 'PDF'}</span>
          </Button>
        </div>
      </div>

      {templateError ? <p className="no-print text-destructive text-sm">{templateError}</p> : null}
      {configError ? <p className="no-print text-destructive text-sm">{configError}</p> : null}
      {pdfError ? <p className="no-print text-destructive text-sm">{pdfError}</p> : null}
      {jsonError ? <p className="no-print text-destructive text-sm">{jsonError}</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}

      <div className="flex items-start gap-2">
        {previewLoading && !html && !error ? (
          <CvPreviewLoadingRow />
        ) : (
          <>
            {layoutInitialConfig && desktopPanelExpanded ? (
              <div className="hidden shrink-0 lg:block">
                <div className="sticky top-6">
                  <TemplateConfigPanel
                    key={selectedTemplateId}
                    id="cv-layout-panel"
                    initialConfig={layoutInitialConfig}
                    onChange={handlePresentationChange}
                    className="w-48 p-3"
                  />
                </div>
              </div>
            ) : null}

            <div className="relative min-w-0 flex-1">
              {html ? <CvPreviewIframe html={html} frameRef={previewFrameRef} /> : null}
            </div>
          </>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          id="cv-layout-panel-drawer"
          side="left"
          className="flex w-72 flex-col gap-3 overflow-y-auto px-2 py-4 sm:max-w-sm"
        >
          <SheetHeader>
            <SheetTitle>Layout</SheetTitle>
          </SheetHeader>
          <div className="flex-1">
            {layoutInitialConfig ? (
              <TemplateConfigPanel
                key={selectedTemplateId}
                id="cv-layout-panel-drawer-content"
                initialConfig={layoutInitialConfig}
                onChange={handlePresentationChange}
                className="bg-transparent p-0"
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
