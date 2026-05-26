'use client';

import { Editable, useEditor } from '@wysimark/react';
import { useEffect, useMemo, useRef } from 'react';
import type { Editor } from 'slate';
import { ReactEditor } from 'slate-react';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'block';
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Bumped by parents to re-run focus when the editor mounts asynchronously. */
  focusRequestId?: number;
  onFocused?: () => void;
}

function focusSlateEditor(root: HTMLDivElement | null, editor: Editor): boolean {
  try {
    ReactEditor.focus(editor);
    return true;
  } catch {
    // Slate has not linked its DOM yet — fall back to the rendered surface.
  }

  const editable = root?.querySelector<HTMLElement>('[data-slate-editor="true"]');
  if (!editable) {
    return false;
  }

  editable.focus();
  return document.activeElement === editable || editable.contains(document.activeElement);
}

export function MarkdownEditorImpl({
  value = '',
  onChange,
  variant = 'block',
  placeholder,
  className,
  autoFocus = false,
  focusRequestId,
  onFocused,
}: MarkdownEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editorOptions = useMemo(
    () =>
      variant === 'inline'
        ? { minHeight: 36, maxHeight: 72, minimalToolbar: true }
        : { minHeight: 200, maxHeight: 480, compactBlockToolbar: true },
    [variant],
  );

  const editor = useEditor(editorOptions);

  useEffect(() => {
    if (!autoFocus) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let observer: MutationObserver | undefined;

    const tryFocus = (): boolean => {
      if (cancelled) {
        return false;
      }
      if (!focusSlateEditor(rootRef.current, editor)) {
        return false;
      }
      onFocused?.();
      return true;
    };

    if (tryFocus()) {
      return undefined;
    }

    observer = new MutationObserver(() => {
      if (tryFocus()) {
        observer?.disconnect();
      }
    });

    if (rootRef.current) {
      observer.observe(rootRef.current, { childList: true, subtree: true });
    }

    let attempts = 0;
    const poll = () => {
      if (tryFocus()) {
        observer?.disconnect();
        return;
      }
      attempts += 1;
      if (attempts < 120) {
        timeoutId = window.setTimeout(poll, 16);
        return;
      }
      observer?.disconnect();
    };

    timeoutId = window.setTimeout(poll, 0);

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [autoFocus, focusRequestId, editor]);

  return (
    <div
      ref={rootRef}
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
