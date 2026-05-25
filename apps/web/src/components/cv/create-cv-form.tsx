'use client';

import type { Resume } from '@resumind/types';
import { useState } from 'react';
import { BasicsFormFields } from '@/components/cv/basics-form-fields';
import { TextField } from '@/components/cv/form-fields';
import { Button } from '@/components/ui/button';
import { uploadResumeMedia } from '@/lib/api';

type Basics = NonNullable<Resume['basics']>;

export interface CreateCvFormProps {
  onSave: (payload: { title: string; basics: Basics }) => Promise<void>;
  onCancel: () => void;
}

function createEmptyBasics(): Basics {
  return { location: {} };
}

export function CreateCvForm({ onSave, onCancel }: CreateCvFormProps) {
  const [title, setTitle] = useState('');
  const [basics, setBasics] = useState<Basics>(createEmptyBasics);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, basics });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create CV');
      setSaving(false);
    }
  };

  const handleProfilePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    setError(null);
    try {
      const { url } = await uploadResumeMedia(file);
      setBasics((current) => ({ ...current, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const busy = saving || uploadingPhoto;

  return (
    <div className="space-y-6">
      <TextField label="CV title" placeholder="Untitled CV" value={title} onChange={setTitle} />
      <BasicsFormFields
        value={basics}
        onChange={setBasics}
        onProfilePhotoFileSelect={handleProfilePhotoUpload}
        imageFieldId="create-cv-image-url"
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={handleSave} disabled={busy}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
