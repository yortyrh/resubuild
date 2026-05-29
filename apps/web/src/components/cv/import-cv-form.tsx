'use client';

import { Link, Upload } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { ImportFileUpload } from '@/components/cv/import-file-upload';
import { ImportJsonEditDialog } from '@/components/cv/import-json-edit-dialog';
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

export const MAX_IMPORT_FILE_BYTES = 1024 * 1024;

const JSON_FILE_ACCEPT = {
  'application/json': ['.json'],
};

export interface ImportCvFormProps {
  onImport: (payload: { data: Record<string, unknown>; useGravatar: boolean }) => Promise<void>;
  onCancel: () => void;
}

function normalizeImportError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Failed to import CV';
}

export function ImportCvForm({ onImport, onCancel }: ImportCvFormProps) {
  const editorDescribedById = useId();
  const gravatarOptionId = useId();
  const [jsonText, setJsonText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [useGravatar, setUseGravatar] = useState(false);
  const [preview, setPreview] = useState<ImportSourcePreview | null>(null);

  useEffect(() => {
    setImportError(null);
    if (!jsonText.trim()) {
      setPreview(null);
      setUseGravatar(false);
      return;
    }

    const initial = parseImportJsonSource(jsonText);
    setPreview(initial);
    setUseGravatar(false);

    if (!initial.valid || initial.imageStatus !== 'checking' || !initial.basicsImage) {
      return;
    }

    let cancelled = false;
    const imageUrl = initial.basicsImage;

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
  }, [jsonText]);

  const handleFileSelect = async (file: File | null) => {
    setFileError(null);
    setImportError(null);
    setSelectedFile(file);
    setUrlInput('');

    if (!file) {
      setJsonText('');
      return;
    }

    try {
      const text = await file.text();
      setJsonText(formatJsonForEditor(text));
    } catch (err) {
      setFileError(normalizeImportError(err));
      setSelectedFile(null);
    }
  };

  const handleUrlFetch = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setUrlFetchError(null);
    setImportError(null);
    setSelectedFile(null);
    setJsonText('');
    setPreview(null);
    setUrlFetching(true);

    try {
      const result = await importCvFromUrl(trimmed);
      setJsonText(formatJsonForEditor(JSON.stringify(result.data)));
      setPreview(parseImportJsonSource(JSON.stringify(result.data)));
      setUseGravatar(false);
    } catch (err) {
      setUrlFetchError(err instanceof Error ? err.message : 'Failed to fetch URL');
    } finally {
      setUrlFetching(false);
    }
  };

  const canImport = Boolean(jsonText.trim()) && preview?.valid === true && !importing;

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

  const jsonError = preview && !preview.valid ? preview.message : null;
  const schemaErrors = preview && !preview.valid ? preview.schemaErrors : undefined;
  const imageHint =
    preview?.valid && preview.imageStatus !== 'owned'
      ? imageStatusLabel(preview.imageStatus)
      : null;

  return (
    <>
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
              Paste any publicly accessible HTTPS URL that returns JSON Resume data. See the{' '}
              <a
                href="https://jsonresume.org/schema"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                JSON Resume schema
              </a>{' '}
              for the format.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="url-import"
              type="url"
              placeholder="https://example.com/resume.json"
              value={urlInput}
              disabled={importing || urlFetching}
              onChange={(e) => setUrlInput(e.target.value)}
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">or import a file</span>
          </div>
        </div>

        <ImportFileUpload
          accept={JSON_FILE_ACCEPT}
          maxBytes={MAX_IMPORT_FILE_BYTES}
          label="JSON Resume file"
          hint="Drag and drop a JSON Resume file or browse…"
          disabled={importing}
          value={selectedFile}
          onFileSelect={(file) => {
            void handleFileSelect(file);
          }}
        />
        <p className="text-muted-foreground text-sm">
          Choose a JSON Resume file to import. Validation runs automatically after the file is
          loaded.
        </p>

        {fileError ? <p className="text-destructive text-sm">{fileError}</p> : null}
        {jsonError ? <p className="text-destructive text-sm">{jsonError}</p> : null}
        {schemaErrors && schemaErrors.length > 0 ? (
          <div
            className="border-destructive/30 bg-destructive/5 rounded-md border p-3"
            role="alert"
            aria-labelledby={editorDescribedById}
          >
            <p id={editorDescribedById} className="text-destructive mb-2 text-sm font-medium">
              Fix these schema issues before importing:
            </p>
            <ul className="text-destructive list-inside list-disc space-y-1 text-sm">
              {schemaErrors.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {preview?.valid ? (
          <p className="text-muted-foreground text-sm">JSON Resume file is valid.</p>
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
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => setEditDialogOpen(true)}
          >
            Edit JSON…
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={importing}>
            Cancel
          </Button>
        </div>
      </form>

      <ImportJsonEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        value={jsonText}
        onSave={(value) => {
          setJsonText(value);
          setImportError(null);
        }}
      />
    </>
  );
}
