'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ImportFileUpload } from '@/components/cv/import-file-upload';
import { Button } from '@/components/ui/button';
import { getAiAgentActive, getPdfImportJob, startPdfImport } from '@/lib/api';

export const MAX_PDF_IMPORT_BYTES = 5 * 1024 * 1024;

const PDF_FILE_ACCEPT = {
  'application/pdf': ['.pdf'],
};

export interface ImportPdfCvFormProps {
  onSuccess: (cvId: string) => void;
  onCancel: () => void;
  pollIntervalMs?: number;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import PDF';
}

export function ImportPdfCvForm({
  onSuccess,
  onCancel,
  pollIntervalMs = 2000,
}: ImportPdfCvFormProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getAiAgentActive()
      .then((config) => setConfigured(config.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    return () => {
      setImporting(false);
    };
  }, []);

  const handleFileSelect = (file: File | null) => {
    setError(null);
    setSelectedFile(file);
  };

  const pollJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const job = await getPdfImportJob(jobId);
      if (job.progress) {
        setProgress(job.progress);
      }

      if (job.status === 'succeeded' && job.cvId) {
        onSuccess(job.cvId);
        return;
      }

      if (job.status === 'failed') {
        throw new Error(job.errors?.join('\n') ?? 'PDF import failed');
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('PDF import timed out');
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }

    setImporting(true);
    setError(null);
    setProgress('uploading');

    try {
      const { jobId } = await startPdfImport(selectedFile);
      await pollJob(jobId);
    } catch (err) {
      setError(normalizeImportError(err));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  if (configured === null) {
    return <p className="text-muted-foreground text-sm">Checking import settings…</p>;
  }

  if (!configured) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          PDF import requires an active AI agent account. Open the user menu (top right) → AI agent
          settings to add a provider, model, and API key.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/settings/ai-agent">Open AI agent settings</Link>
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ImportFileUpload
        accept={PDF_FILE_ACCEPT}
        maxBytes={MAX_PDF_IMPORT_BYTES}
        label="PDF résumé"
        hint="Drag and drop a PDF résumé or browse…"
        disabled={importing}
        value={selectedFile}
        onFileSelect={handleFileSelect}
      />

      {progress ? (
        <div
          className="border-muted bg-muted/30 rounded-md border px-3 py-2"
          role="status"
          data-testid="import-pdf-progress"
        >
          <p className="text-muted-foreground text-sm">Import in progress: {progress}</p>
        </div>
      ) : null}
      {error ? (
        <div
          className="border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2"
          role="alert"
          data-testid="import-pdf-error"
        >
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button
          type="button"
          disabled={!selectedFile || importing}
          onClick={() => void handleImport()}
        >
          {importing ? 'Importing…' : 'Import PDF'}
        </Button>
        <Button type="button" variant="outline" disabled={importing} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
