'use client';

import { type KeyboardEvent, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateCv } from '@/lib/api';

interface EditableCvTitleProps {
  cvId: string;
  initialTitle: string;
}

export function EditableCvTitle({ cvId, initialTitle }: EditableCvTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(title);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(title);
    setEditing(false);
  };

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateCv(cvId, { title: draft });
      setTitle(draft);
      setEditing(false);
      toast.success('Title updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save title');
    } finally {
      setSaving(false);
    }
  }, [cvId, draft, saving]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !saving) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-3">
        <Input
          aria-label="CV title"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          autoFocus
          className="flex-1 text-xl font-semibold"
        />
        <Button type="button" onClick={save} disabled={saving} size="sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving} size="sm">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-tight">
        {title.trim() || <span className="text-muted-foreground">Untitled CV</span>}
      </h2>
      <Button type="button" variant="outline" size="sm" onClick={startEdit}>
        Edit
      </Button>
    </div>
  );
}
