'use client';

import ISO6391 from 'iso-639-1';
import { Check, ChevronDown } from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LanguageFieldProps {
  label?: string;
  description?: string;
  value?: string;
  onChange: (languageName: string) => void;
}

const ALL_OPTIONS = ISO6391.getAllCodes().map((code) => ({
  code,
  primary: ISO6391.getName(code),
}));

ALL_OPTIONS.sort((a, b) => a.primary.localeCompare(b.primary, 'en'));

/** Limit rows before search so first open stays cheap (interaction → next paint). */
const INITIAL_OPEN_ROWS = 64;
const SEARCH_RESULT_CAP = 120;

export function LanguageField({
  label = 'Language',
  description,
  value = '',
  onChange,
}: LanguageFieldProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const trimmedValue = value.trim();

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmedQuery) {
      return ALL_OPTIONS.slice(0, INITIAL_OPEN_ROWS);
    }
    return ALL_OPTIONS.filter(({ code, primary }) => {
      const cq = code.toLowerCase();
      return primary.toLowerCase().includes(trimmedQuery) || cq.includes(trimmedQuery);
    }).slice(0, SEARCH_RESULT_CAP);
  }, [trimmedQuery]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const listener = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [open]);

  const selectedLabel = trimmedValue
    ? (() => {
        const meta = ALL_OPTIONS.find((o) => o.primary === trimmedValue);
        return meta ? `${meta.primary} (${meta.code})` : trimmedValue;
      })()
    : '';

  const picked = filtered[Math.min(activeIdx, Math.max(0, filtered.length - 1))];

  const selectLanguage = (name: string) => {
    onChange(name.trim());
    setQuery('');
    setOpen(false);
    setActiveIdx(0);
  };

  const onComboKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && filtered.length && picked) {
      e.preventDefault();
      selectLanguage(picked.primary);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      <div
        ref={wrapperRef}
        className="relative"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? `${listId}-dropdown` : undefined}
        aria-haspopup="listbox"
        aria-owns={`${listId}-listbox`}
        onKeyDown={onComboKeyDown}
      >
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          className={cn(
            'relative h-10 w-full justify-between px-3 font-normal transition-[box-shadow,transform,color] duration-150',
            open &&
              'bg-accent text-accent-foreground ring-ring ring-offset-background ring-2 ring-offset-2',
          )}
          aria-label={`${label}, choose language`}
          aria-controls={open ? `${listId}-dropdown` : undefined}
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            if (nextOpen) {
              setQuery('');
              setActiveIdx(0);
            }
          }}
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || 'Select language…'}
          </span>
          <ChevronDown
            className={cn(
              'ms-2 h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 motion-reduce:transition-none',
              open && '-rotate-180',
            )}
            aria-hidden
          />
        </Button>

        {open ? (
          <div
            id={`${listId}-dropdown`}
            role="presentation"
            className="border-border bg-popover text-popover-foreground absolute isolate z-50 mt-1 w-full rounded-md border p-2 shadow-lg"
          >
            <Input
              autoFocus
              value={query}
              placeholder="Search by name or code…"
              aria-controls={`${listId}-listbox`}
              aria-autocomplete="list"
              aria-activedescendant={picked ? `${listId}-opt-${picked.code}` : undefined}
              className="border-border bg-popover text-popover-foreground mb-2"
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
            />
            {!trimmedQuery ? (
              <p className="text-muted-foreground mb-2 px-1 text-xs">
                Showing the first few languages — type letters to narrow the rest.
              </p>
            ) : null}
            <ul
              id={`${listId}-listbox`}
              aria-label={`${label} options`}
              className="border-border bg-popover max-h-60 overflow-y-auto rounded-md border py-1 [scrollbar-gutter:stable]"
              style={{ contain: 'paint' }}
            >
              {filtered.length === 0 ? (
                <li className="text-muted-foreground px-3 py-2 text-sm">No match</li>
              ) : (
                filtered.map((item, idx) => (
                  <li
                    role="presentation"
                    key={item.code}
                    id={`${listId}-opt-${item.code}`}
                    className={cn(
                      idx === Math.min(activeIdx, filtered.length - 1)
                        ? 'bg-accent text-accent-foreground'
                        : '',
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={trimmedValue === item.primary}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                      onClick={() => selectLanguage(item.primary)}
                    >
                      <span className="min-w-[2rem] font-mono text-xs tracking-wide">
                        {item.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.primary}</span>
                      {trimmedValue === item.primary ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
