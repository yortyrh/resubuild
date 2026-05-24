'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Resume } from '@resumind/types';
import { createEmptyResume, stripResumeMetaFromEditor } from '@resumind/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CvSections } from '@/components/cv/cv-sections';
import { createCv, updateCv } from '@/lib/api';

interface CvEditorProps {
  cvId?: string;
  initialTitle?: string;
  initialResume?: Resume;
}

function sanitizeResume(resume: Resume): Record<string, unknown> {
  const cleaned = JSON.parse(JSON.stringify(resume)) as Resume;

  const stripEmptyStrings = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.trim() === '' ? undefined : value;
    }
    if (Array.isArray(value)) {
      const next = value
        .map(stripEmptyStrings)
        .filter((item) => item !== undefined && item !== null);
      return next.length > 0 ? next : undefined;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, stripEmptyStrings(nested)] as const)
        .filter(([, nested]) => nested !== undefined);
      return entries.length > 0 ? Object.fromEntries(entries) : undefined;
    }
    return value;
  };

  return (stripEmptyStrings(cleaned) ?? {}) as Record<string, unknown>;
}

export function CvEditor({ cvId, initialTitle = 'Untitled CV', initialResume }: CvEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [resume, setResume] = useState<Resume>(() =>
    initialResume ? stripResumeMetaFromEditor(initialResume) : createEmptyResume(),
  );
  const [conflictVersion, setConflictVersion] = useState(initialResume?.meta?.version);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = sanitizeResume(resume);

      if (cvId && conflictVersion) {
        data.meta = { version: conflictVersion };
      }

      if (cvId) {
        const updated = await updateCv(cvId, { title, data });
        const savedMeta = (updated.data as Resume).meta;
        setConflictVersion(savedMeta?.version);
        toast.success('CV updated');
      } else {
        const created = await createCv({ title, data });
        toast.success('CV created');
        router.replace(`/dashboard/cv/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save CV');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 flex-1">
          <Label htmlFor="cv-title">CV title</Label>
          <Input
            id="cv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save CV'}
        </Button>
      </div>
      <CvSections resume={resume} onChange={setResume} />
    </div>
  );
}
