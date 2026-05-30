'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ImportFormActionsProps {
  importLabel?: string;
  importingLabel?: string;
  importing?: boolean;
  canImport: boolean;
  canPreview?: boolean;
  canEdit?: boolean;
  importButtonType?: 'button' | 'submit';
  onImport: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onCancel: () => void;
}

export function ImportFormActions({
  importLabel = 'Import',
  importingLabel,
  importing = false,
  canImport,
  canPreview = false,
  canEdit = false,
  importButtonType = 'button',
  onImport,
  onPreview,
  onEdit,
  onCancel,
}: ImportFormActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type={importButtonType}
        disabled={!canImport}
        onClick={importButtonType === 'button' ? onImport : undefined}
      >
        {importing
          ? (importingLabel ?? (importLabel === 'Save' ? 'Saving…' : 'Importing…'))
          : importLabel}
      </Button>
      {onPreview ? (
        <Button type="button" variant="outline" disabled={!canPreview} onClick={onPreview}>
          Preview
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" variant="outline" disabled={!canEdit} onClick={onEdit}>
          <Pencil className="mr-1.5 size-4" aria-hidden="true" />
          Edit
        </Button>
      ) : null}
      <Button type="button" variant="outline" onClick={onCancel} disabled={importing}>
        Cancel
      </Button>
    </div>
  );
}
