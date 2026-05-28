'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getImportLlmConfig, getPdfImportJob, startPdfImport } from '@/lib/api';

export const MAX_PDF_IMPORT_BYTES = 5 * 1024 * 1024;

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
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getImportLlmConfig()
      .then((config) => setConfigured(config.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    return () => {
      setImporting(false);
    };
  }, []);

  const handleFileChange = (file: File | null) => {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setSelectedFile(null);
      setError('Only PDF files are supported.');
      return;
    }

    if (file.size > MAX_PDF_IMPORT_BYTES) {
      setSelectedFile(null);
      setError('PDF exceeds the maximum upload size.');
      return;
    }

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
          PDF import requires LLM settings. Configure a provider, model, and API key first.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/settings/import-llm">Configure LLM settings</Link>
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
      <div className="space-y-2">
        <Label htmlFor={fileInputId}>PDF résumé</Label>
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="block w-full text-sm"
          disabled={importing}
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        />
        {selectedFile ? (
          <p className="text-muted-foreground text-sm">Selected: {selectedFile.name}</p>
        ) : null}
      </div>

      {progress ? <p className="text-muted-foreground text-sm">Status: {progress}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

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
