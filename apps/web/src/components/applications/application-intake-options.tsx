'use client';

import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Label } from '@/components/ui/label';
import type { CvRecord } from '@/lib/api';

export interface ApplicationIntakeOptionsProps {
  cvs: CvRecord[];
  pickMode: 'auto' | 'manual';
  onPickModeChange: (mode: 'auto' | 'manual') => void;
  sourceCvId: string;
  onSourceCvIdChange: (id: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  messageId?: string;
}

export function ApplicationIntakeOptions({
  cvs,
  pickMode,
  onPickModeChange,
  sourceCvId,
  onSourceCvIdChange,
  message,
  onMessageChange,
  messageId = 'application-message',
}: ApplicationIntakeOptionsProps) {
  return (
    <>
      <fieldset className="space-y-3">
        <legend className="font-medium">Base CV (optional)</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={pickMode === 'auto'}
            onChange={() => onPickModeChange('auto')}
          />
          Let AI pick best match
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={pickMode === 'manual'}
            onChange={() => onPickModeChange('manual')}
          />
          Choose CV
        </label>
        {pickMode === 'manual' ? (
          <select
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={sourceCvId}
            onChange={(e) => onSourceCvIdChange(e.target.value)}
          >
            <option value="">Select a CV…</option>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.title}
              </option>
            ))}
          </select>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={messageId}>Optional instruction</Label>
        <div id={messageId}>
          <MarkdownEditor
            value={message}
            onChange={onMessageChange}
            placeholder="Emphasize React experience…"
          />
        </div>
      </div>
    </>
  );
}
