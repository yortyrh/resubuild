'use client';

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

export interface ImportWebsiteFormProps {
  onImport: (payload: { data: Record<string, unknown>; useGravatar: boolean }) => Promise<void>;
  onCancel: () => void;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import CV';
}

export function ImportWebsiteForm({ onImport, onCancel }: ImportWebsiteFormProps) {
  const gravatarOptionId = useId();
  const [urlInput, setUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [useGravatar, setUseGravatar] = useState(false);
  const [preview, setPreview] = useState<ImportSourcePreview | null>(null);

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

  const handleUrlFetch = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      return;
    }

    setUrlFetchError(null);
    setImportError(null);
    setPreview(null);
    setUrlFetching(true);

    try {
      const result = await importCvFromUrl(trimmed);
      setPreview(parseImportJsonSource(JSON.stringify(result.data)));
      setUseGravatar(false);
    } catch (err) {
      setUrlFetchError(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      setUrlFetching(false);
    }
  };

  const canImport = preview?.valid === true && !importing;

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
          <Label htmlFor="website-import">Import from website</Label>
          <p className="text-muted-foreground text-sm">
            Paste an HTTPS URL that returns JSON Resume data, including JSON Resume Registry profile
            URLs such as{' '}
            <span className="font-mono text-xs">registry.jsonresume.org/your-username</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="website-import"
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
