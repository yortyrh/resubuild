'use client';

import { Editable, useEditor } from '@wysimark/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
}

export function MarkdownEditorImpl({
  value = '',
  onChange,
  variant = 'block',
  placeholder,
  className,
}: MarkdownEditorProps) {
  const editorOptions = useMemo(
    () =>
      variant === 'inline'
        ? { minHeight: 56, maxHeight: 120, minimalToolbar: true }
        : { minHeight: 200, maxHeight: 480, compactBlockToolbar: true },
    [variant],
  );

  const editor = useEditor(editorOptions);

  return (
    <div
      className={cn(
        'rich-text-editor',
        variant === 'inline' && 'rich-text-editor--inline',
        className,
      )}
    >
      <div className="border-input bg-background rounded-none border">
        <Editable
          editor={editor}
          value={value}
          onChange={onChange}
          throttleInMs={variant === 'inline' ? 300 : 500}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export default MarkdownEditorImpl;
