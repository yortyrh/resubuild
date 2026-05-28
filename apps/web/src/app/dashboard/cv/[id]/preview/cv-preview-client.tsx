'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadCvPdf, getCvExportHtml } from '@/lib/api';

interface CvPreviewClientProps {
  cvId: string;
}

export function CvPreviewClient({ cvId }: CvPreviewClientProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCvExportHtml(cvId)
      .then((documentHtml) => {
        if (!cancelled) setHtml(documentHtml);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [cvId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfError(null);
    setDownloading(true);
    try {
      const { blob, filename } = await downloadCvPdf(cvId);
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
  }, [cvId]);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
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

      {pdfError ? <p className="no-print text-destructive text-sm">{pdfError}</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}
      {!html && !error ? <p className="text-muted-foreground">Loading preview…</p> : null}

      {html ? (
        <div
          className="cv-export-preview overflow-x-auto rounded-md border bg-white"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted HTML from authenticated API export only
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  );
}
