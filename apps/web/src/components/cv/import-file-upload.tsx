'use client';

import { Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ImportKindBadge } from '@/components/cv/import-kind-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type ImportFileAccept = Record<string, readonly string[]>;

export interface ImportFileUploadProps {
  accept: ImportFileAccept;
  maxBytes: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  value: File | null;
  kindLabel?: string | null;
  onFileSelect: (file: File | null) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAcceptAttribute(accept: ImportFileAccept): string {
  const mimeTypes = Object.keys(accept);
  const extensions = Object.values(accept).flat();
  return [...mimeTypes, ...extensions].join(',');
}

function isFileAccepted(file: File, accept: ImportFileAccept): boolean {
  const mimeTypes = Object.keys(accept);
  const extensions = Object.values(accept)
    .flat()
    .map((entry) => entry.toLowerCase());

  if (file.type && mimeTypes.includes(file.type)) {
    return true;
  }

  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
  return extensions.includes(extension);
}

export function ImportFileUpload({
  accept,
  maxBytes,
  label,
  hint = 'Drag and drop or browse…',
  disabled = false,
  value,
  kindLabel = null,
  onFileSelect,
}: ImportFileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateAndSelect = (file: File | null) => {
    setValidationError(null);

    if (!file) {
      onFileSelect(null);
      return;
    }

    if (!isFileAccepted(file, accept)) {
      setValidationError('File type is not supported.');
      return;
    }

    if (file.size > maxBytes) {
      setValidationError(`File is too large (max ${formatFileSize(maxBytes)}).`);
      return;
    }

    onFileSelect(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    validateAndSelect(file);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) {
      return;
    }

    const file = event.dataTransfer.files?.[0] ?? null;
    validateAndSelect(file);
  };

  const handleClear = () => {
    setValidationError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const dashedBoxClassName = cn(
    'border-input bg-background h-28 w-full rounded-lg border border-dashed px-4',
    disabled && 'opacity-50',
  );

  return (
    <div className="space-y-2" data-testid="import-file-upload">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={buildAcceptAttribute(accept)}
        className="sr-only"
        disabled={disabled}
        data-testid="import-file-upload-input"
        onChange={handleInputChange}
      />
      {value ? (
        <div className={cn(dashedBoxClassName, 'relative flex items-center')}>
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {kindLabel ? <ImportKindBadge label={kindLabel} testId="import-file-kind" /> : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="Clear selected file"
              data-testid="import-file-upload-clear"
              onClick={handleClear}
            >
              <X className="size-4" />
            </Button>
          </div>
          <button
            type="button"
            disabled={disabled}
            className="hover:bg-accent/40 focus-visible:ring-ring min-w-0 flex-1 rounded-md px-2 py-1 pr-36 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            onClick={() => inputRef.current?.click()}
            aria-describedby={validationError ? `${inputId}-error` : undefined}
          >
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-muted-foreground text-xs">{formatFileSize(value.size)}</p>
          </button>
        </div>
      ) : (
        <button
          type="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          className={cn(
            dashedBoxClassName,
            'hover:bg-accent/40 focus-visible:ring-ring flex w-full flex-col items-center justify-center gap-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            dragActive && 'border-primary bg-accent/30',
            disabled && 'pointer-events-none',
          )}
          onClick={() => {
            if (!disabled) {
              inputRef.current?.click();
            }
          }}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-describedby={validationError ? `${inputId}-error` : undefined}
        >
          <Upload className="text-muted-foreground size-8" aria-hidden />
          <span className="text-sm font-medium">{hint}</span>
          <span className="text-muted-foreground text-xs">Max {formatFileSize(maxBytes)}</span>
        </button>
      )}
      {validationError ? (
        <p
          id={`${inputId}-error`}
          className="text-destructive text-sm"
          data-testid="import-file-upload-error"
        >
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
