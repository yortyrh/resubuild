'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { formatJsonForEditor } from '@/components/cv/json-resume-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { importCvFromUrl } from '@/lib/api';
import { checkImportableMediaUrl } from '@/lib/import-cv-media';
import {
  gravatarOptionForImageStatus,
  type ImportImagePreviewStatus,
  type ImportSourcePreview,
  imageStatusLabel,
  parseImportJsonSource,
  probeExternalImageUrl,
} from '@/lib/import-cv-preview';
import { useAiAgentActive, usePdfImportJob } from '@/lib/queries/ai-agent-queries';
import { useWebScrapeConfig } from '@/lib/queries/web-scrape-queries';

export const IMPORT_URL_RETURN_PATH = '/dashboard/cv/new/import/url';

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

export function ImportUrlForm({ onImport, onCancel, pollIntervalMs = 2000 }: ImportUrlFormProps) {
  const gravatarOptionId = useId();
  const { data: activeStatus } = useAiAgentActive();
  const { data: scrapeStatus } = useWebScrapeConfig();
  const aiConfigured = activeStatus?.configured ?? false;

  const [urlInput, setUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [useGravatar, setUseGravatar] = useState(false);
  const [preview, setPreview] = useState<ImportSourcePreview | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);

  const { data: jobStatus, error: jobError } = usePdfImportJob(jobId, pollIntervalMs);

  useEffect(() => {
    if (!preview?.valid || preview.imageStatus !== 'checking' || !preview.basicsImage) {
      return;
    }

    let cancelled = false;
    const imageUrl = preview.basicsImage;

    void (async () => {
      const browserReachable = await probeExternalImageUrl(imageUrl);
      if (cancelled) {
        return;
      }

      let imageStatus: ImportImagePreviewStatus = browserReachable ? 'reachable' : 'unreachable';
      if (browserReachable) {
        const serverImportable = await checkImportableMediaUrl(imageUrl);
        if (cancelled) {
          return;
        }
        if (!serverImportable) {
          imageStatus = 'host_not_allowed';
        }
      }

      setPreview((current) => {
        if (!current || !current.valid || current.basicsImage !== imageUrl) {
          return current;
        }
        return {
          ...current,
          imageStatus,
          showGravatarOption: gravatarOptionForImageStatus(current.basicsEmail, imageStatus),
        };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [preview]);

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
      setPreview(parseImportJsonSource(JSON.stringify(jobStatus.previewData)));
      setUseGravatar(false);
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
    setPreview(null);
    setJobId(null);
    setFetchProgress(null);
    setUrlFetching(true);

    let startedAgentJob = false;
    try {
      const result = await importCvFromUrl(trimmed);
      if (result.kind === 'json') {
        setPreview(parseImportJsonSource(JSON.stringify(result.data)));
        setUseGravatar(false);
      } else {
        startedAgentJob = true;
        setJobId(result.jobId);
        setFetchProgress('queued');
      }
    } catch (err) {
      setUrlFetchError(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      if (!startedAgentJob) {
        setUrlFetching(false);
      }
    }
  };

  const canImport = preview?.valid === true && !importing && !urlFetching;

  const handleImport = async () => {
    if (!canImport || !preview?.valid) {
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

  const imageHint =
    preview?.valid && preview.imageStatus !== 'owned'
      ? imageStatusLabel(preview.imageStatus)
      : null;

  const scrapeHint = scrapeStatus?.configured
    ? `Page extraction: ${scrapeStatus.provider}`
    : 'Page extraction: raw HTML (configure Firecrawl or Tavily in settings)';

  const settingsReturnTo = `${IMPORT_URL_RETURN_PATH}?returnLabel=${encodeURIComponent('Back to URL import')}`;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canImport) {
          void handleImport();
        }
      }}
    >
      <div className="space-y-4 rounded-lg border border-dashed p-4">
        <div className="space-y-1">
          <Label htmlFor="url-import">Import from URL</Label>
          <p className="text-muted-foreground text-sm">
            Paste any public HTTPS résumé URL. JSON Resume endpoints (including{' '}
            <span className="font-mono text-xs">registry.jsonresume.org/your-username</span>) are
            imported immediately; HTML pages are converted by the AI agent.
          </p>
          <p className="text-muted-foreground text-xs">
            {scrapeHint}.{' '}
            <Link
              href={`/dashboard/settings/ai-agent?returnTo=${encodeURIComponent(settingsReturnTo)}`}
              className="underline"
            >
              Configure in AI agent settings
            </Link>
            . For a local <span className="font-mono text-xs">.json</span> file, use{' '}
            <Link href="/dashboard/cv/new/import/json" className="underline">
              Import JSON
            </Link>
            .
          </p>
        </div>
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
        <div className="flex gap-2">
          <Input
            id="url-import"
            type="url"
            placeholder="https://registry.jsonresume.org/your-username"
            value={urlInput}
            disabled={importing || urlFetching}
            onChange={(event) => setUrlInput(event.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!urlInput.trim() || importing || urlFetching}
            onClick={() => void handleUrlFetch()}
          >
            {urlFetching ? 'Fetching…' : 'Fetch'}
          </Button>
        </div>
        {fetchProgress ? (
          <p className="text-muted-foreground text-sm">Agent progress: {fetchProgress}</p>
        ) : null}
        {urlFetchError ? <p className="text-destructive text-sm">{urlFetchError}</p> : null}
      </div>

      {preview?.valid ? (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Preview</p>
          <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs">
            {formatJsonForEditor(JSON.stringify(preview.prepared))}
          </pre>
        </div>
      ) : null}

      {preview?.valid ? (
        <p className="text-muted-foreground text-sm">JSON Resume data is valid.</p>
      ) : null}
      {imageHint ? <p className="text-muted-foreground text-sm">{imageHint}</p> : null}

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

      {importError ? (
        <p className="text-destructive whitespace-pre-wrap text-sm">{importError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canImport}>
          {importing ? 'Importing…' : 'Import'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={importing}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
