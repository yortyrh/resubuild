'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { ImportFormActions } from '@/components/cv/import-form-actions';
import { ImportJsonEditDialog } from '@/components/cv/import-json-edit-dialog';
import { ImportKindBadge } from '@/components/cv/import-kind-badge';
import { ImportPreviewDialog } from '@/components/cv/import-preview-dialog';
import { ImportProgressBar } from '@/components/cv/import-progress-bar';
import { ImportValidationFeedback } from '@/components/cv/import-validation-feedback';
import { formatJsonForEditor } from '@/components/cv/json-resume-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { importCvFromUrl } from '@/lib/api';
import type { ImportValidationSource } from '@/lib/import-validation-source';
import { useAiAgentActive, usePdfImportJob } from '@/lib/queries/ai-agent-queries';
import { useWebScrapeConfig } from '@/lib/queries/web-scrape-queries';
import { useImportJsonPreview } from '@/lib/use-import-json-preview';
import { useImportPreviewToasts } from '@/lib/use-import-preview-toasts';

export const IMPORT_URL_RETURN_PATH = '/dashboard/cv/new/import/url';

export type ImportUrlKind = 'json' | 'html';

export interface ImportUrlFormProps {
  onImport: (payload: { data: Record<string, unknown>; useGravatar: boolean }) => Promise<void>;
  onCancel: () => void;
  pollIntervalMs?: number;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import CV';
}

function importUrlKindLabel(kind: ImportUrlKind): string {
  return kind === 'json' ? 'JSON Resume' : 'HTML page';
}

export function ImportUrlForm({ onImport, onCancel, pollIntervalMs = 2000 }: ImportUrlFormProps) {
  const gravatarOptionId = useId();
  const { data: activeStatus } = useAiAgentActive();
  const { data: scrapeStatus } = useWebScrapeConfig();
  const aiConfigured = activeStatus?.configured ?? false;

  const [urlInput, setUrlInput] = useState('');
  const [urlKind, setUrlKind] = useState<ImportUrlKind | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [validationSource, setValidationSource] = useState<ImportValidationSource>('none');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const { preview, useGravatar, setUseGravatar } = useImportJsonPreview(jsonText);
  const { data: jobStatus, error: jobError } = usePdfImportJob(jobId, pollIntervalMs);

  useImportPreviewToasts({
    resetKey: urlInput.trim(),
    preview,
    validationSource,
  });

  useEffect(() => {
    if (!jobStatus) {
      return;
    }

    if (jobStatus.progress) {
      setFetchProgress(jobStatus.progress);
    }

    if (jobStatus.status === 'succeeded' && jobStatus.previewData) {
      setJobId(null);
      setUrlFetching(false);
      setUrlFetchError(null);
      setFetchProgress(null);
      setValidationSource('agent');
      setUrlKind('html');
      setJsonText(formatJsonForEditor(JSON.stringify(jobStatus.previewData)));
      return;
    }

    if (jobStatus.status === 'failed') {
      setJobId(null);
      setUrlFetching(false);
      setFetchProgress(null);
      setUrlFetchError(jobStatus.errors?.join('\n') ?? 'URL import failed');
    }
  }, [jobStatus]);

  useEffect(() => {
    if (jobError) {
      setJobId(null);
      setUrlFetching(false);
      setFetchProgress(null);
      setUrlFetchError(normalizeImportError(jobError));
    }
  }, [jobError]);

  const handleUrlFetch = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      return;
    }

    setUrlFetchError(null);
    setImportError(null);
    setJsonText('');
    setValidationSource('none');
    setUrlKind(null);
    setJobId(null);
    setFetchProgress('fetching');
    setUrlFetching(true);

    let startedAgentJob = false;
    try {
      const result = await importCvFromUrl(trimmed);
      if (result.kind === 'json') {
        setValidationSource('direct');
        setUrlKind('json');
        setJsonText(formatJsonForEditor(JSON.stringify(result.data)));
      } else {
        startedAgentJob = true;
        setUrlKind('html');
        setJobId(result.jobId);
        setFetchProgress('queued');
      }
    } catch (err) {
      setUrlFetchError(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      if (!startedAgentJob) {
        setUrlFetching(false);
        setFetchProgress(null);
      }
    }
  };

  const isSavePhase = preview?.valid === true;
  const canFetchUrl = Boolean(urlInput.trim()) && !isSavePhase && !importing && !urlFetching;
  const canSave = isSavePhase && !importing && !urlFetching;
  const canImport = canFetchUrl || canSave;
  const canPreview = isSavePhase && !importing && !urlFetching;
  const canEdit = Boolean(jsonText.trim()) && !importing && !urlFetching;

  const activeImportProgress = (() => {
    if (importing && isSavePhase) {
      return 'saving';
    }
    if (urlFetching) {
      return fetchProgress ?? 'fetching';
    }
    return null;
  })();

  const handleSave = async () => {
    if (!canSave || !preview?.valid) {
      return;
    }

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
  };

  const handlePrimaryAction = async () => {
    if (isSavePhase) {
      await handleSave();
      return;
    }
    await handleUrlFetch();
  };

  const scrapeHint = scrapeStatus?.configured
    ? `Page extraction: ${scrapeStatus.provider}`
    : 'Page extraction: raw HTML (configure Firecrawl or Tavily in settings)';

  const settingsReturnTo = `${IMPORT_URL_RETURN_PATH}?returnLabel=${encodeURIComponent('Back to URL import')}`;

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canImport) {
            void handlePrimaryAction();
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="url-import">Résumé URL</Label>
          <div className="border-input bg-background relative flex h-28 items-center rounded-lg border border-dashed px-4">
            {urlKind ? (
              <ImportKindBadge
                label={importUrlKindLabel(urlKind)}
                testId="import-url-kind"
                className="absolute right-4 top-3"
              />
            ) : null}
            <Input
              id="url-import"
              type="url"
              placeholder="https://registry.jsonresume.org/your-username"
              value={urlInput}
              disabled={importing || urlFetching}
              className={urlKind ? 'pr-28' : undefined}
              onChange={(event) => {
                setUrlInput(event.target.value);
                setUrlKind(null);
                setJsonText('');
                setValidationSource('none');
                setUrlFetchError(null);
                setImportError(null);
              }}
            />
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          JSON Resume endpoints import immediately; HTML pages are converted by the AI agent.{' '}
          {scrapeHint}.{' '}
          <Link
            href={`/dashboard/settings/ai-agent?returnTo=${encodeURIComponent(settingsReturnTo)}`}
            className="underline"
          >
            Configure in AI agent settings
          </Link>
          . For a local file instead, use{' '}
          <Link href="/dashboard/cv/new/import/file" className="underline">
            Import from file
          </Link>
          .
        </p>

        {!aiConfigured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            An active AI agent account is required for HTML pages. JSON endpoints work without extra
            configuration.{' '}
            <Link href="/dashboard/settings/ai-agent" className="underline">
              Open settings
            </Link>
            .
          </p>
        ) : null}

        <ImportFormActions
          importLabel={isSavePhase ? 'Save' : 'Import'}
          importing={urlFetching || importing}
          importingLabel={isSavePhase ? 'Saving…' : 'Importing…'}
          canImport={canImport}
          canPreview={canPreview}
          canEdit={canEdit}
          importButtonType="submit"
          onImport={() => {}}
          onPreview={() => setPreviewDialogOpen(true)}
          onEdit={() => setEditDialogOpen(true)}
          onCancel={onCancel}
        />

        <ImportProgressBar progress={activeImportProgress} />

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

        {urlFetchError ? <p className="text-destructive text-sm">{urlFetchError}</p> : null}

        <ImportValidationFeedback validationSource={validationSource} preview={preview} />

        {importError ? (
          <p className="text-destructive whitespace-pre-wrap text-sm">{importError}</p>
        ) : null}
      </form>

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
