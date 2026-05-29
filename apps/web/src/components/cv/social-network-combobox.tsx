'use client';

import { allSocialNetworkOptions, SOCIAL_NETWORK_SUGGESTIONS } from '@resumind/resume-template';
import { Check, ChevronDown } from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SocialNetworkComboboxProps {
  label?: string;
  description?: string;
  value?: string;
  onChange: (network: string) => void;
}

const ALL_OPTIONS = allSocialNetworkOptions();

const PRIORITY_SET = new Set<string>(SOCIAL_NETWORK_SUGGESTIONS);

function sortFiltered(matches: string[]): string[] {
  return [...matches].sort((a, b) => {
    const aPri = PRIORITY_SET.has(a);
    const bPri = PRIORITY_SET.has(b);
    if (aPri !== bPri) return aPri ? -1 : 1;
    return a.localeCompare(b, 'en');
  });
}

export function SocialNetworkCombobox({
  label = 'Network',
  description,
  value = '',
  onChange,
}: SocialNetworkComboboxProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const trimmedValue = value.trim();
  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmedQuery) {
      return [...SOCIAL_NETWORK_SUGGESTIONS];
    }
    const matches = ALL_OPTIONS.filter((opt) => opt.toLowerCase().includes(trimmedQuery));
    return sortFiltered(matches);
  }, [trimmedQuery]);

  useEffect(() => {
    if (!open) return undefined;
    const listener = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [open]);

  const commitValue = (raw: string) => {
    const next = raw.trim();
    if (next !== trimmedValue) {
      onChange(next);
    }
    setQuery('');
    setOpen(false);
    setActiveIdx(0);
  };

  const selectOption = (option: string) => {
    onChange(option);
    setQuery('');
    setOpen(false);
    setActiveIdx(0);
    inputRef.current?.blur();
  };

  const picked = filtered[Math.min(activeIdx, Math.max(0, filtered.length - 1))];

  const onComboKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered.length && picked) {
        selectOption(picked);
        return;
      }
      commitValue(query || trimmedValue);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
    }
  };

  const displayValue = open ? query : trimmedValue;

  return (
    <div className="space-y-2">
      <Label htmlFor={`${listId}-input`}>{label}</Label>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      <div
        ref={wrapperRef}
        className="relative"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? `${listId}-dropdown` : undefined}
        aria-haspopup="listbox"
        onKeyDown={onComboKeyDown}
      >
        <div className="relative">
          <Input
            ref={inputRef}
            id={`${listId}-input`}
            value={displayValue}
            placeholder="LinkedIn, GitHub, or custom…"
            aria-autocomplete="list"
            aria-controls={open ? `${listId}-listbox` : undefined}
            aria-activedescendant={open && picked ? `${listId}-opt-${picked}` : undefined}
            className="pe-9"
            onFocus={() => {
              setQuery(trimmedValue);
              setOpen(true);
              setActiveIdx(0);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIdx(0);
            }}
            onBlur={(e) => {
              const next = e.relatedTarget;
              if (next && wrapperRef.current?.contains(next)) {
                return;
              }
              commitValue(query || trimmedValue);
            }}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${label}, show suggestions`}
            className="text-muted-foreground absolute inset-y-0 end-0 flex items-center px-2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next) {
                setQuery(trimmedValue);
                setActiveIdx(0);
                inputRef.current?.focus();
              }
            }}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 opacity-70 transition-transform duration-200 motion-reduce:transition-none',
                open && '-rotate-180',
              )}
              aria-hidden
            />
          </button>
        </div>

        {open ? (
          <div
            id={`${listId}-dropdown`}
            role="presentation"
            className="border-border bg-popover text-popover-foreground absolute isolate z-50 mt-1 w-full rounded-md border py-1 shadow-lg"
          >
            <ul
              id={`${listId}-listbox`}
              aria-label={`${label} options`}
              className="max-h-60 overflow-y-auto [scrollbar-gutter:stable]"
            >
              {filtered.length === 0 ? (
                <li className="text-muted-foreground px-3 py-2 text-sm">
                  No match — press Enter to use your text
                </li>
              ) : (
                filtered.map((item, idx) => (
                  <li
                    role="presentation"
                    key={item}
                    id={`${listId}-opt-${item}`}
                    className={cn(
                      idx === Math.min(activeIdx, filtered.length - 1)
                        ? 'bg-accent text-accent-foreground'
                        : '',
                    )}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={trimmedValue === item}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(item)}
                    >
                      <span className="min-w-0 flex-1 truncate">{item}</span>
                      {trimmedValue === item ? (
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
