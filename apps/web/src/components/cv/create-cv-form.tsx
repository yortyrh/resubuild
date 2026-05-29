'use client';

import type { Resume } from '@resumind/types';
import { useState } from 'react';
import { BasicsFormFields } from '@/components/cv/basics-form-fields';
import { Button } from '@/components/ui/button';

type Basics = NonNullable<Resume['basics']>;

export interface CreateCvFormProps {
  onSave: (payload: { basics: Basics }) => Promise<void>;
  onCancel: () => void;
}

function createEmptyBasics(): Basics {
  return { location: {} };
}

export function CreateCvForm({ onSave, onCancel }: CreateCvFormProps) {
  const [basics, setBasics] = useState<Basics>(createEmptyBasics);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ basics });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create CV');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) {
          void handleSave();
        }
      }}
    >
      <BasicsFormFields value={basics} onChange={setBasics} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
