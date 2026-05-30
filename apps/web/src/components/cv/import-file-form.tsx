'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { ImportFileFormSkeleton } from '@/components/cv/import-file-form-skeleton';
import { ImportFileUpload } from '@/components/cv/import-file-upload';
import { ImportFormActions } from '@/components/cv/import-form-actions';
import { ImportJsonEditDialog } from '@/components/cv/import-json-edit-dialog';
import { ImportPreviewDialog } from '@/components/cv/import-preview-dialog';
import { ImportProgressBar } from '@/components/cv/import-progress-bar';
import { ImportValidationFeedback } from '@/components/cv/import-validation-feedback';
import { formatJsonForEditor } from '@/components/cv/json-resume-editor';
import { Label } from '@/components/ui/label';
import { importCvFromMarkdown, startPdfImport } from '@/lib/api';
import {
  detectImportFileKind,
  getImportFileMaxBytes,
  IMPORT_FILE_ACCEPT,
  IMPORT_FILE_MAX_BYTES,
  type ImportFileKind,
  importFileKindLabel,
  importFileKindRequiresAgent,
} from '@/lib/import-file-kind';
import type { ImportValidationSource } from '@/lib/import-validation-source';
import { useAiAgentActive, usePdfImportJob } from '@/lib/queries/ai-agent-queries';
import { useImportJsonPreview } from '@/lib/use-import-json-preview';
import { useImportPreviewToasts } from '@/lib/use-import-preview-toasts';

export interface ImportFileFormProps {
  onImport: (payload: { data: Record<string, unknown>; useGravatar: boolean }) => Promise<void>;
  onCancel: () => void;
  pollIntervalMs?: number;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import file';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportFileForm({ onImport, onCancel, pollIntervalMs = 2000 }: ImportFileFormProps) {
  const gravatarOptionId = useId();
  const { data: activeStatus, isLoading: activeLoading } = useAiAgentActive();
  const configured = activeStatus?.configured ?? false;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<ImportFileKind | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [validationSource, setValidationSource] = useState<ImportValidationSource>('none');
  const [importing, setImporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const { preview, useGravatar, setUseGravatar } = useImportJsonPreview(jsonText);
  const { data: jobStatus, error: jobError } = usePdfImportJob(jobId, pollIntervalMs);
  const jobRunning = importing && Boolean(jobId);
  const needsAgent = fileKind !== null && importFileKindRequiresAgent(fileKind);

  useImportPreviewToasts({
    resetKey: selectedFile?.name ?? '',
    preview,
    validationSource,
  });

  useEffect(() => {
    if (!jobStatus) {
      return;
    }

    if (jobStatus.progress) {
      setProgress(jobStatus.progress);
    }

    if (jobStatus.status === 'succeeded' && jobStatus.previewData) {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      setAgentError(null);
      setValidationSource('agent');
      setJsonText(formatJsonForEditor(JSON.stringify(jobStatus.previewData)));
      return;
    }

    if (jobStatus.status === 'failed') {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      setAgentError(jobStatus.errors?.join('\n') ?? 'Import failed');
    }
  }, [jobStatus]);

  useEffect(() => {
    if (jobError) {
      setImporting(false);
      setJobId(null);
      setProgress(null);
      setAgentError(normalizeImportError(jobError));
    }
  }, [jobError]);

  const resetPreviewState = () => {
    setJsonText('');
    setValidationSource('none');
    setJobId(null);
    setProgress(null);
    setAgentError(null);
    setImportError(null);
  };

  const handleFileSelect = async (file: File | null) => {
    setFileError(null);
    setAgentError(null);
    setImportError(null);
    setSelectedFile(file);
    resetPreviewState();

    if (!file) {
      setFileKind(null);
      return;
    }

    const kind = detectImportFileKind(file);
    if (!kind) {
      setFileError('Unsupported file type. Use JSON, PDF, or Markdown.');
      setSelectedFile(null);
      setFileKind(null);
      return;
    }

    const maxBytes = getImportFileMaxBytes(kind);
    if (file.size > maxBytes) {
      setFileError(
        `File is too large (max ${formatFileSize(maxBytes)} for ${importFileKindLabel(kind)}).`,
      );
      setSelectedFile(null);
      setFileKind(null);
      return;
    }

    setFileKind(kind);

    if (kind === 'json') {
      try {
        const text = await file.text();
        setValidationSource('direct');
        setJsonText(formatJsonForEditor(text));
      } catch (err) {
        setFileError(normalizeImportError(err));
        setSelectedFile(null);
        setFileKind(null);
      }
    }
  };

  const startAgentJob = async () => {
    if (!selectedFile || !fileKind || !importFileKindRequiresAgent(fileKind)) {
      return;
    }

    if (!configured) {
      setAgentError('An active AI agent account is required for PDF and Markdown files.');
      return;
    }

    setImporting(true);
    setAgentError(null);
    setImportError(null);
    setProgress('uploading');
    setJsonText('');
    setValidationSource('none');

    try {
      const { jobId: nextJobId } =
        fileKind === 'pdf'
          ? await startPdfImport(selectedFile)
          : await importCvFromMarkdown(selectedFile);
      setJobId(nextJobId);
    } catch (err) {
      setImporting(false);
      setProgress(null);
      setAgentError(normalizeImportError(err));
    }
  };

  const handleImport = async () => {
    if (preview?.valid) {
      setImporting(true);
      setImportError(null);
      try {
        await onImport({
          data: preview.prepared,
          useGravatar: useGravatar && preview.showGravatarOption,
        });
      } catch (err) {
        setImportError(normalizeImportError(err));
      } finally {
        setImporting(false);
      }
      return;
    }

    if (fileKind === 'json') {
      return;
    }

    await startAgentJob();
  };

  const canCreateCv = preview?.valid === true && !jobRunning;
  const canStartAgent =
    Boolean(selectedFile) && needsAgent && !preview?.valid && !importing && configured;
  const canImport = canCreateCv || canStartAgent;
  const canPreview = preview?.valid === true && !jobRunning;
  const canEdit = Boolean(jsonText.trim()) && !jobRunning;

  if (activeLoading) {
    return <ImportFileFormSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        <ImportFileUpload
          accept={IMPORT_FILE_ACCEPT}
          maxBytes={IMPORT_FILE_MAX_BYTES}
          label="Résumé file"
          hint="Drag and drop a JSON, PDF, or Markdown résumé…"
          disabled={importing}
          value={selectedFile}
          kindLabel={fileKind ? importFileKindLabel(fileKind) : null}
          onFileSelect={(file) => {
            void handleFileSelect(file);
          }}
        />

        <p className="text-muted-foreground text-sm">
          Supported formats: JSON Resume (<span className="font-mono text-xs">.json</span>), PDF (
          <span className="font-mono text-xs">.pdf</span>), and Markdown (
          <span className="font-mono text-xs">.md</span>). PDF and Markdown are converted by the AI
          agent. To import from a link instead, use{' '}
          <Link href="/dashboard/cv/new/import/url" className="underline">
            Import from URL
          </Link>
          .
        </p>

        {needsAgent && !configured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            PDF and Markdown files require an active AI agent account.{' '}
            <Link href="/dashboard/settings/ai-agent" className="underline">
              Open AI agent settings
            </Link>
            .
          </p>
        ) : null}

        <ImportFormActions
          importLabel={preview?.valid ? 'Save' : 'Import'}
          importing={jobRunning || (importing && preview?.valid === true)}
          importingLabel={preview?.valid ? 'Saving…' : 'Importing…'}
          canImport={canImport}
          canPreview={canPreview}
          canEdit={canEdit}
          onImport={() => {
            void handleImport();
          }}
          onPreview={() => setPreviewDialogOpen(true)}
          onEdit={() => setEditDialogOpen(true)}
          onCancel={onCancel}
        />

        <ImportProgressBar progress={jobRunning ? progress : null} />

        {preview?.valid && preview.showGravatarOption ? (
          <div className="flex items-start gap-2">
            <input
              id={gravatarOptionId}
              type="checkbox"
              className="border-input mt-1 size-4 rounded border"
              checked={useGravatar}
              disabled={importing}
              onChange={(event) => setUseGravatar(event.target.checked)}
            />
            <Label htmlFor={gravatarOptionId} className="font-normal leading-snug">
              Use Gravatar profile photo
              {preview.basicsEmail ? ` (${preview.basicsEmail})` : ''}
            </Label>
          </div>
        ) : null}

        {agentError ? (
          <div
            className="border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2"
            role="alert"
            data-testid="import-file-agent-error"
          >
            <p className="text-destructive text-sm">{agentError}</p>
          </div>
        ) : null}

        <ImportValidationFeedback
          validationSource={validationSource}
          preview={preview}
          fileError={fileError}
        />

        {importError ? (
          <p className="text-destructive whitespace-pre-wrap text-sm">{importError}</p>
        ) : null}
      </div>

      <ImportPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        resume={preview?.valid ? preview.prepared : null}
      />

      <ImportJsonEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        value={jsonText}
        onSave={(value) => {
          setJsonText(value);
          setValidationSource('edited');
          setImportError(null);
        }}
      />
    </>
  );
}
