'use client';

import dynamic from 'next/dynamic';
import { Label } from '@/components/ui/label';
import '@uiw/react-textarea-code-editor/dist.css';

/** Visible editor area: scroll when JSON is longer than this. */
const JSON_EDITOR_MIN_HEIGHT_PX = 280;
const JSON_EDITOR_MAX_HEIGHT = 'min(26rem, 55vh)';

const CodeEditor = dynamic(
  () => import('@uiw/react-textarea-code-editor').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div
        className="border-input bg-muted/30 text-muted-foreground flex items-center justify-center rounded-md border text-sm"
        style={{ minHeight: JSON_EDITOR_MIN_HEIGHT_PX, maxHeight: JSON_EDITOR_MAX_HEIGHT }}
        aria-hidden
      >
        Loading editor…
      </div>
    ),
  },
);

export interface JsonResumeEditorProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  'aria-describedby'?: string;
}

export function JsonResumeEditor({
  id,
  label = 'JSON Resume',
  value,
  onChange,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
}: JsonResumeEditorProps) {
  return (
    <div className="space-y-2">
      <Label id={id}>{label}</Label>
      <div
        className="border-input overflow-hidden rounded-md border"
        data-testid="json-resume-editor"
        aria-describedby={ariaDescribedBy}
      >
        <CodeEditor
          value={value}
          language="json"
          aria-label={label}
          placeholder='{ "basics": { "name": "…" }, … }'
          readOnly={disabled}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          padding={12}
          minHeight={JSON_EDITOR_MIN_HEIGHT_PX}
          data-color-mode="light"
          style={{
            fontSize: 13,
            width: '100%',
            minHeight: JSON_EDITOR_MIN_HEIGHT_PX,
            maxHeight: JSON_EDITOR_MAX_HEIGHT,
            overflowY: 'auto',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
            backgroundColor: 'hsl(var(--muted) / 0.35)',
          }}
        />
      </div>
    </div>
  );
}

/** Pretty-print JSON when possible; otherwise keep the raw text for editing. */
export function formatJsonForEditor(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  try {
    return `${JSON.stringify(JSON.parse(trimmed), null, 2)}\n`;
  } catch {
    return text;
  }
}
