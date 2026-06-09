'use client';

import { X } from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface PrepareApplicationFilePickerProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function PrepareApplicationFilePicker({
  value,
  onChange,
  disabled = false,
}: PrepareApplicationFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_BYTES) {
      toast.error(`File must be 5 MB or smaller (${formatBytes(file.size)} selected).`);
      event.target.value = '';
      return;
    }

    if (file.type !== '' && !ACCEPT.split(',').includes(file.type)) {
      toast.error('Only PDF, PNG, JPEG, and WebP files are supported.');
      event.target.value = '';
      return;
    }

    onChange(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleTrigger = () => {
    inputRef.current?.click();
  };

  return (
    <div className="surface-soft text-card-foreground flex flex-wrap items-center gap-3 p-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={handleSelect}
        disabled={disabled}
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleTrigger}
        disabled={disabled}
        data-testid="prepare-file-picker-trigger"
      >
        Choose file
      </Button>

      {value ? (
        <>
          <div
            className="text-muted-foreground min-w-0 flex-1 text-sm"
            data-testid="prepare-file-picker-meta"
          >
            <span className="text-foreground truncate font-medium">{value.name}</span>
            <span className="text-muted-foreground">
              {' '}
              · {formatBytes(value.size)} · {value.type || 'unknown type'}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Remove file"
            data-testid="prepare-file-picker-remove"
          >
            <X className="size-4" />
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">PDF or screenshot, up to 5 MB.</p>
      )}
    </div>
  );
}

export const PREPARE_APPLICATION_FILE_ACCEPT = ACCEPT;
export const PREPARE_APPLICATION_FILE_MAX_BYTES = MAX_BYTES;
