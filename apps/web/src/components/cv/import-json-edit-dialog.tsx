'use client';

import { useEffect, useState } from 'react';
import { JsonResumeEditor } from '@/components/cv/json-resume-editor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ImportJsonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onSave: (value: string) => void;
}

export function ImportJsonEditDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: ImportJsonEditDialogProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value || '{\n}\n');
    }
  }, [open, value]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>
            Edit the JSON Resume source. Changes apply after Save.
          </DialogDescription>
        </DialogHeader>
        <JsonResumeEditor value={draft} onChange={setDraft} label="JSON source" />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
