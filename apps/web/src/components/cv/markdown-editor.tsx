'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { ICommand } from '@uiw/react-md-editor';
import { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { cn } from '@/lib/utils';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

type PreviewMode = 'edit' | 'preview';

function buildToolbar(
  variant: 'inline' | 'block',
  previewMode: PreviewMode,
  togglePreview: () => void,
): ICommand[] {
  const previewToggle: ICommand = {
    name: 'preview-toggle',
    keyCommand: 'preview',
    buttonProps: {
      'aria-label': previewMode === 'edit' ? 'Show preview' : 'Back to edit',
      title: previewMode === 'edit' ? 'Show preview' : 'Back to edit',
    },
    icon: previewMode === 'edit' ? commands.codePreview.icon : commands.codeEdit.icon,
    execute: () => togglePreview(),
  };

  const base: ICommand[] = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.divider,
  ];

  if (variant === 'block') {
    base.push(
      commands.link,
      commands.quote,
      commands.code,
      commands.divider,
      commands.unorderedListCommand,
      commands.orderedListCommand,
      commands.checkedListCommand,
      commands.divider,
    );
  }

  base.push(previewToggle);
  return base;
}

interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value = '',
  onChange,
  variant = 'block',
  placeholder,
  className,
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('edit');

  const toolbar = useMemo(
    () =>
      buildToolbar(variant, previewMode, () =>
        setPreviewMode((current) => (current === 'edit' ? 'preview' : 'edit')),
      ),
    [variant, previewMode],
  );

  return (
    <div
      className={cn(
        'md-editor-field',
        variant === 'inline' && 'md-editor-field--inline',
        className,
      )}
      data-color-mode="light"
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? '')}
        preview={previewMode}
        commands={toolbar}
        extraCommands={[]}
        visibleDragbar={false}
        height={variant === 'inline' ? 72 : 220}
        textareaProps={{
          placeholder,
          ...(variant === 'inline'
            ? {
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                  }
                },
              }
            : {}),
        }}
      />
    </div>
  );
}
