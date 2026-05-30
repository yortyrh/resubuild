'use client';

import { renderResumeHtml } from '@resumind/resume-template';
import type { Resume } from '@resumind/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CvPreviewIframe } from '@/components/cv/cv-preview-iframe';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { type CvTemplateMeta, listCvTemplates } from '@/lib/api';

export interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resume: Record<string, unknown> | null;
}

export function ImportPreviewDialog({ open, onOpenChange, resume }: ImportPreviewDialogProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [templates, setTemplates] = useState<CvTemplateMeta[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoadError(null);

    listCvTemplates()
      .then((catalog) => {
        if (cancelled) {
          return;
        }
        setTemplates(catalog);
        if (catalog.length > 0 && !catalog.some((entry) => entry.id === selectedTemplateId)) {
          setSelectedTemplateId(catalog[0]?.id ?? 'classic');
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const html = useMemo(() => {
    if (!resume) {
      return null;
    }
    return renderResumeHtml(resume as Resume, selectedTemplateId);
  }, [resume, selectedTemplateId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Import preview</DialogTitle>
        </DialogHeader>

        <div className="flex shrink-0 items-end gap-4">
          <div className="min-w-[14rem] flex-1 space-y-1">
            <Label htmlFor="import-preview-template">Template</Label>
            <select
              id="import-preview-template"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              disabled={templates.length === 0 || !resume}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadError ? <p className="text-destructive text-sm">{loadError}</p> : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {html ? <CvPreviewIframe html={html} frameRef={frameRef} /> : null}
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
