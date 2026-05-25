'use client';

import type { Resume } from '@resumind/types';
import { createEmptyResume, stripResumeMetaFromEditor } from '@resumind/types';
import { useState } from 'react';
import { toast } from 'sonner';
import { CvSections } from '@/components/cv/cv-sections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCv } from '@/lib/api';

interface CvEditorProps {
  cvId: string;
  initialTitle?: string;
  initialResume?: Resume;
}

export function CvEditor({ cvId, initialTitle = 'Untitled CV', initialResume }: CvEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [resume, setResume] = useState<Resume>(() =>
    initialResume ? stripResumeMetaFromEditor(initialResume) : createEmptyResume(),
  );
  const [version, setVersion] = useState(initialResume?.meta?.version);
  const [savingTitle, setSavingTitle] = useState(false);

  const saveTitle = async () => {
    setSavingTitle(true);
    try {
      await updateCv(cvId, { title });
      toast.success('Title updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save title');
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 space-y-2">
          <Label htmlFor="cv-title">CV title</Label>
          <Input id="cv-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button onClick={saveTitle} disabled={savingTitle} variant="outline">
          {savingTitle ? 'Saving…' : 'Save title'}
        </Button>
      </div>
      <CvSections
        cvId={cvId}
        version={version}
        onVersionChange={setVersion}
        resume={resume}
        onResumeChange={setResume}
      />
    </div>
  );
}
