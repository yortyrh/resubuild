'use client';

import { Plus, X } from 'lucide-react';
import {
  type ClipboardEvent,
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { MarkdownView } from '@/components/cv/markdown-view';
import { cn } from '@/lib/utils';

/** Inline Markdown worth rendering when the bullet is not being edited. */
const INLINE_MARKDOWN = /(\*\*|__|\*[^\s*]|_[^\s_]|`|~~|\[[^\]]*\]\()/;

/** Leading list markers people paste from other CVs ("- ", "* ", "• ", "1. "). */
const LIST_MARKER = /^\s*(?:[-*•‣◦▪–]|\d+[.)])\s+/;

export function hasInlineMarkdown(value: string): boolean {
  return INLINE_MARKDOWN.test(value);
}

export function splitPastedBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(LIST_MARKER, '').trim())
    .filter(Boolean);
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `bullet-${idCounter}`;
}

interface PendingFocus {
  id: string;
  caret: number | 'end';
}

interface BulletListFieldProps {
  /** Singular noun for one row, e.g. "Highlight" or "Course". */
  itemLabel: string;
  /** Group name, e.g. "Highlights". */
  label: string;
  values?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Bullets edited as plain text, one auto-growing field per bullet, set like the
 * printed list. Markdown typed by hand or written by AI is kept as text and shown
 * rendered while the bullet is not focused.
 */
export function BulletListField({
  itemLabel,
  label,
  values = [],
  onChange,
  placeholder,
  className,
}: BulletListFieldProps) {
  const idsRef = useRef<string[]>([]);
  // Keep one stable id per row. Rows added or removed outside this component
  // (draft reset, AI rewrite) are reconciled by position.
  if (idsRef.current.length !== values.length) {
    const ids = idsRef.current.slice(0, values.length);
    while (ids.length < values.length) ids.push(nextId());
    idsRef.current = ids;
  }
  const ids = idsRef.current;

  const fieldRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<PendingFocus | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const latest = useRef({ values, onChange });
  latest.current = { values, onChange };

  const commit = useCallback((nextValues: string[], nextIds: string[], focus?: PendingFocus) => {
    idsRef.current = nextIds;
    pendingFocus.current = focus ?? null;
    latest.current.onChange(nextValues);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: values triggers focus after re-render
  useEffect(() => {
    const focus = pendingFocus.current;
    if (!focus) return;
    pendingFocus.current = null;
    const node = fieldRefs.current.get(focus.id);
    if (!node) return;
    node.focus();
    const caret = focus.caret === 'end' ? node.value.length : focus.caret;
    node.setSelectionRange(caret, caret);
  }, [values]);

  const focusRow = useCallback((index: number, caret: number | 'end') => {
    const id = idsRef.current[index];
    const node = id ? fieldRefs.current.get(id) : undefined;
    if (!node) return;
    node.focus();
    const position = caret === 'end' ? node.value.length : caret;
    node.setSelectionRange(position, position);
  }, []);

  const handlers = useRef({
    change(index: number, value: string) {
      const next = [...latest.current.values];
      next[index] = value;
      latest.current.onChange(next);
    },
    remove(index: number) {
      const vals = latest.current.values;
      const nextIds = idsRef.current.filter((_, i) => i !== index);
      const target = nextIds[Math.max(0, index - 1)];
      commit(
        vals.filter((_, i) => i !== index),
        nextIds,
        target ? { id: target, caret: 'end' } : undefined,
      );
    },
    keyDown(index: number, event: KeyboardEvent<HTMLTextAreaElement>) {
      const node = event.currentTarget;
      const vals = latest.current.values;
      const current = vals[index] ?? '';
      const collapsed = node.selectionStart === node.selectionEnd;
      const caret = node.selectionStart;
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        const before = current.slice(0, caret);
        const after = current.slice(node.selectionEnd);
        const newId = nextId();
        const nextValues = [...vals];
        nextValues.splice(index, 1, before, after);
        const nextIds = [...idsRef.current];
        nextIds.splice(index + 1, 0, newId);
        commit(nextValues, nextIds, { id: newId, caret: 0 });
        return;
      }

      if (event.key === 'Backspace' && collapsed && caret === 0 && index > 0) {
        event.preventDefault();
        const previous = vals[index - 1] ?? '';
        const nextValues = [...vals];
        nextValues.splice(index - 1, 2, previous + current);
        const nextIds = idsRef.current.filter((_, i) => i !== index);
        commit(nextValues, nextIds, { id: nextIds[index - 1]!, caret: previous.length });
        return;
      }

      if (
        event.key === 'Delete' &&
        collapsed &&
        caret === current.length &&
        index < vals.length - 1
      ) {
        event.preventDefault();
        const nextValues = [...vals];
        nextValues.splice(index, 2, current + (vals[index + 1] ?? ''));
        const nextIds = idsRef.current.filter((_, i) => i !== index + 1);
        commit(nextValues, nextIds, { id: nextIds[index]!, caret: current.length });
        return;
      }

      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        const target = event.key === 'ArrowUp' ? index - 1 : index + 1;
        if (target < 0 || target >= vals.length) return;
        event.preventDefault();
        const nextValues = [...vals];
        const nextIds = [...idsRef.current];
        [nextValues[index], nextValues[target]] = [nextValues[target]!, nextValues[index]!];
        [nextIds[index], nextIds[target]] = [nextIds[target]!, nextIds[index]!];
        commit(nextValues, nextIds, { id: nextIds[target]!, caret });
        return;
      }

      if (event.key === 'ArrowUp' && collapsed && caret === 0 && index > 0) {
        event.preventDefault();
        focusRow(index - 1, 'end');
        return;
      }

      if (
        event.key === 'ArrowDown' &&
        collapsed &&
        caret === current.length &&
        index < vals.length - 1
      ) {
        event.preventDefault();
        focusRow(index + 1, 0);
      }
    },
    paste(index: number, event: ClipboardEvent<HTMLTextAreaElement>) {
      const lines = splitPastedBullets(event.clipboardData.getData('text/plain'));
      if (lines.length < 2) return;
      event.preventDefault();
      const node = event.currentTarget;
      const vals = latest.current.values;
      const current = vals[index] ?? '';
      const before = current.slice(0, node.selectionStart);
      const after = current.slice(node.selectionEnd);
      const inserted = [...lines];
      inserted[0] = before + inserted[0];
      const lastIndex = inserted.length - 1;
      const caret = inserted[lastIndex]!.length;
      inserted[lastIndex] = inserted[lastIndex] + after;
      const nextValues = [...vals];
      nextValues.splice(index, 1, ...inserted);
      const newIds = inserted.slice(1).map(() => nextId());
      const nextIds = [...idsRef.current];
      nextIds.splice(index + 1, 0, ...newIds);
      commit(nextValues, nextIds, { id: nextIds[index + lastIndex]!, caret });
    },
    focus(id: string) {
      setFocusedId(id);
    },
    blur(id: string) {
      setFocusedId((current) => (current === id ? null : current));
    },
    register(id: string, node: HTMLTextAreaElement | null) {
      if (node) fieldRefs.current.set(id, node);
      else fieldRefs.current.delete(id);
    },
  }).current;

  const addRow = () => {
    const newId = nextId();
    commit([...values, ''], [...ids, newId], { id: newId, caret: 0 });
  };

  return (
    <fieldset className={cn('composer-bullets min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{label}</legend>
      {values.length > 0 ? (
        <ul className="list-none space-y-0.5 p-0">
          {values.map((value, index) => {
            const id = ids[index]!;
            return (
              <BulletRow
                key={id}
                id={id}
                index={index}
                total={values.length}
                value={value}
                itemLabel={itemLabel}
                placeholder={placeholder}
                focused={focusedId === id}
                handlers={handlers}
              />
            );
          })}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={addRow}
        className="composer-add text-page-ink-muted hover:text-primary focus-visible:text-primary focus-visible:ring-primary/30 mt-1 inline-flex items-center gap-1.5 rounded-sm py-0.5 pl-[1.1rem] font-sans text-[0.8125rem] font-medium focus-visible:outline-none focus-visible:ring-2"
      >
        <Plus className="size-3.5" aria-hidden />
        Add {itemLabel.toLowerCase()}
      </button>
    </fieldset>
  );
}

interface BulletRowHandlers {
  change: (index: number, value: string) => void;
  remove: (index: number) => void;
  keyDown: (index: number, event: KeyboardEvent<HTMLTextAreaElement>) => void;
  paste: (index: number, event: ClipboardEvent<HTMLTextAreaElement>) => void;
  focus: (id: string) => void;
  blur: (id: string) => void;
  register: (id: string, node: HTMLTextAreaElement | null) => void;
}

interface BulletRowProps {
  id: string;
  index: number;
  total: number;
  value: string;
  itemLabel: string;
  placeholder?: string;
  focused: boolean;
  handlers: BulletRowHandlers;
}

const BulletRow = memo(function BulletRow({
  id,
  index,
  total,
  value,
  itemLabel,
  placeholder,
  focused,
  handlers,
}: BulletRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const showRendered = !focused && hasInlineMarkdown(value);

  // biome-ignore lint/correctness/useExhaustiveDependencies: value triggers the resize
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <li className="composer-bullet group relative flex items-start gap-2">
      <span aria-hidden className="text-page-ink mt-0 w-3 shrink-0 select-none text-center">
        •
      </span>
      <span className="relative min-w-0 flex-1">
        <textarea
          ref={(node) => {
            textareaRef.current = node;
            handlers.register(id, node);
          }}
          rows={1}
          value={value}
          aria-label={`${itemLabel} ${index + 1} of ${total}`}
          placeholder={placeholder ?? itemLabel}
          onChange={(event) => handlers.change(index, event.target.value)}
          onKeyDown={(event) => handlers.keyDown(index, event)}
          onPaste={(event) => handlers.paste(index, event)}
          onFocus={() => handlers.focus(id)}
          onBlur={() => handlers.blur(id)}
          className={cn(
            'composer-field w-full resize-none overflow-hidden bg-transparent',
            showRendered && 'text-transparent',
          )}
        />
        {showRendered ? (
          <span
            aria-hidden
            className="composer-rendered bg-page pointer-events-none absolute inset-0"
          >
            <MarkdownView value={value} variant="inline" className="composer-markdown" />
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
        onClick={() => handlers.remove(index)}
        className="text-page-ink-muted hover:text-destructive focus-visible:text-destructive focus-visible:ring-primary/30 mt-0.5 shrink-0 rounded-sm p-0.5 opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  );
});
