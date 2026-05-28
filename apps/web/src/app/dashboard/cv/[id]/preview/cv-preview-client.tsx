'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type CvTemplateMeta,
  downloadCvPdf,
  getCv,
  getCvExportHtml,
  listCvTemplates,
  updateCvTemplate,
} from '@/lib/api';

interface CvPreviewClientProps {
  cvId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  default: 'Default',
  'first-year': 'First-Year',
  undergraduate: 'Undergraduate',
  design: 'Design',
  global: 'Global',
  masters: 'Masters',
  phd: 'PhD',
  alum: 'Alum',
};

export function CvPreviewClient({ cvId }: CvPreviewClientProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [templates, setTemplates] = useState<CvTemplateMeta[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('mit-classic');
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getCv(cvId), listCvTemplates()])
      .then(([cv, catalog]) => {
        if (cancelled) return;
        setTemplates(catalog);
        setSelectedTemplateId(cv.templateId ?? 'mit-classic');
      })
      .catch((err: Error) => {
        if (!cancelled) setTemplateError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const loadHtml = useCallback(
    async (templateId: string) => {
      setError(null);
      const documentHtml = await getCvExportHtml(cvId, templateId);
      setHtml(documentHtml);
    },
    [cvId],
  );

  useEffect(() => {
    let cancelled = false;

    loadHtml(selectedTemplateId).catch((err: Error) => {
      if (!cancelled) setError(err.message);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, loadHtml]);

  const groupedTemplates = useMemo(() => {
    const groups = new Map<string, CvTemplateMeta[]>();
    for (const template of templates) {
      const key = template.category;
      const list = groups.get(key) ?? [];
      list.push(template);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [templates]);

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

  const handlePrint = useCallback(() => {
    window.print();
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
      <div className="no-print flex flex-wrap items-end gap-4">
        <div className="min-w-[14rem] space-y-1">
          <Label htmlFor="cv-template-select">Template</Label>
          <select
            id="cv-template-select"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={selectedTemplateId}
            onChange={(event) => void handleTemplateChange(event.target.value)}
            disabled={templates.length === 0}
          >
            {groupedTemplates.map(([category, items]) => (
              <optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
                {items.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
      {pdfError ? <p className="no-print text-destructive text-sm">{pdfError}</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}
      {!html && !error ? <p className="text-muted-foreground">Loading preview…</p> : null}

      {html ? (
        <iframe
          title="Resume preview"
          className="cv-export-preview h-[min(1200px,80vh)] w-full rounded-md border bg-white"
          srcDoc={html}
        />
      ) : null}
    </div>
  );
}
