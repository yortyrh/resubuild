'use client';

import { Download, Eye } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCvJson, downloadCvPdf } from '@/lib/api';
import { useCv } from '@/lib/queries/cv-queries';
import { cn } from '@/lib/utils';

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface CvEditorHeaderActionsProps {
  cvId: string;
  className?: string;
}

export function CvEditorHeaderActions({ cvId, className }: CvEditorHeaderActionsProps) {
  const { data: cv } = useCv(cvId);
  const templateId = cv?.templateId ?? 'classic';
  const [exporting, setExporting] = useState<'pdf' | 'json' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPdf = useCallback(async () => {
    setExportError(null);
    setExporting('pdf');
    try {
      const { blob, filename } = await downloadCvPdf(cvId, templateId);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setExporting(null);
    }
  }, [cvId, templateId]);

  const handleExportJson = useCallback(async () => {
    setExportError(null);
    setExporting('json');
    try {
      const { blob, filename } = await downloadCvJson(cvId);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'JSON export failed');
    } finally {
      setExporting(null);
    }
  }, [cvId]);

  const isExporting = exporting !== null;

  return (
    <div className={cn('flex flex-col items-stretch gap-1 sm:items-end', className)}>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`/dashboard/cv/${cvId}/preview`}>
            <Eye className="mr-1.5 size-4 shrink-0" aria-hidden />
            Preview
          </Link>
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={isExporting}
              aria-haspopup="menu"
              aria-label={isExporting ? 'Exporting' : 'Export'}
            >
              <Download className="size-4 shrink-0 lg:mr-1.5" aria-hidden />
              <span className="hidden lg:inline">{isExporting ? 'Exporting…' : 'Export'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={isExporting} onSelect={() => void handleExportPdf()}>
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onSelect={() => void handleExportJson()}>
              Download JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {exportError ? (
        <p className="text-destructive text-right text-xs leading-snug">{exportError}</p>
      ) : null}
    </div>
  );
}
