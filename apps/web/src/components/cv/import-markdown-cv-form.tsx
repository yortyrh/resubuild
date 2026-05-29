'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ImportFileUpload } from '@/components/cv/import-file-upload';
import { Button } from '@/components/ui/button';
import { importCvFromMarkdown } from '@/lib/api';
import { useAiAgentActive, usePdfImportJob } from '@/lib/queries/ai-agent-queries';

export const MAX_MARKDOWN_IMPORT_BYTES = 512 * 1024;

const MARKDOWN_FILE_ACCEPT = {
  'text/markdown': ['.md', '.markdown'],
  'text/plain': ['.md', '.markdown', '.txt'],
};

export interface ImportMarkdownCvFormProps {
  onSuccess: (cvId: string) => void;
  onCancel: () => void;
  pollIntervalMs?: number;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import Markdown';
}

export function ImportMarkdownCvForm({
  onSuccess,
  onCancel,
  pollIntervalMs = 2000,
}: ImportMarkdownCvFormProps) {
  const { data: activeStatus, isLoading: activeLoading } = useAiAgentActive();
  const configured = activeStatus?.configured ?? null;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: jobStatus, error: jobError } = usePdfImportJob(jobId, pollIntervalMs);

  useEffect(() => {
    if (!jobStatus) {
      return;
    }

    if (jobStatus.progress) {
      setProgress(jobStatus.progress);
    }

    if (jobStatus.status === 'succeeded' && jobStatus.cvId) {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      onSuccess(jobStatus.cvId);
      return;
    }

    if (jobStatus.status === 'failed') {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      setError(jobStatus.errors?.join('\n') ?? 'Markdown import failed');
    }
  }, [jobStatus, onSuccess]);

  useEffect(() => {
    if (jobError) {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      setError(normalizeImportError(jobError));
    }
  }, [jobError]);

  const handleFileSelect = (file: File | null) => {
    setError(null);
    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }

    setImporting(true);
    setError(null);
    setProgress('uploading');

    try {
      const { jobId: nextJobId } = await importCvFromMarkdown(selectedFile);
      setJobId(nextJobId);
    } catch (err) {
      setImporting(false);
      setProgress(null);
      setError(normalizeImportError(err));
    }
  };

  if (activeLoading || configured === null) {
    return <p className="text-muted-foreground text-sm">Checking import settings…</p>;
  }

  if (!configured) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          Markdown import requires an active AI agent account. Open the user menu (top right) → AI
          agent settings to add a provider, model, and API key.
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
        accept={MARKDOWN_FILE_ACCEPT}
        maxBytes={MAX_MARKDOWN_IMPORT_BYTES}
        label="Markdown résumé"
        hint="Drag and drop a Markdown résumé or browse…"
        disabled={importing}
        value={selectedFile}
        onFileSelect={handleFileSelect}
      />

      {progress ? (
        <div
          className="border-muted bg-muted/30 rounded-md border px-3 py-2"
          role="status"
          data-testid="import-markdown-progress"
        >
          <p className="text-muted-foreground text-sm">Import in progress: {progress}</p>
        </div>
      ) : null}
      {error ? (
        <div
          className="border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2"
          role="alert"
          data-testid="import-markdown-error"
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
          {importing ? 'Importing…' : 'Import Markdown'}
        </Button>
        <Button type="button" variant="outline" disabled={importing} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
