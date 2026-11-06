'use client';

import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from 'react';
import { Button } from '@/components/ui/button';
import { scheduleScrollAndFocusSectionForm } from '@/lib/focus-section-form';
import { cn } from '@/lib/utils';

interface DeleteItemDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

export function DeleteItemDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirming = false,
}: DeleteItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-background text-foreground ring-border fixed left-1/2 top-1/2 w-[min(100%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-[0_24px_48px_-12px_hsl(var(--shadow-ink)/0.3)] ring-1 backdrop:bg-[hsl(var(--shadow-ink)/0.55)] backdrop:backdrop-blur-[2px]"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 className="wide text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </dialog>
  );
}

interface MoveItemDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

export function MoveItemDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  confirming = false,
}: MoveItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-background text-foreground ring-border fixed left-1/2 top-1/2 w-[min(100%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-[0_24px_48px_-12px_hsl(var(--shadow-ink)/0.3)] ring-1 backdrop:bg-[hsl(var(--shadow-ink)/0.55)] backdrop:backdrop-blur-[2px]"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 className="wide text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Moving…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

export interface ResumeItemSecondaryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ResumeItemRowReorderProps {
  sectionLabel: string;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

interface ResumeItemRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Date range, shown in the left date rail of chronological sections. */
  dates?: ReactNode;
  /** Secondary facts shown under the subtitle (location, score, issuer…). */
  meta?: ReactNode;
  children?: ReactNode;
  onEdit: () => void;
  onDelete?: () => void;
  secondaryAction?: ResumeItemSecondaryAction;
  reorder?: ResumeItemRowReorderProps;
  isDragging?: boolean;
}

const iconButtonClassName = 'text-muted-foreground hover:text-foreground size-8 px-0';

export function ResumeItemRow({
  title,
  subtitle,
  dates,
  meta,
  children,
  onEdit,
  onDelete,
  secondaryAction,
  reorder,
  isDragging = false,
}: ResumeItemRowProps) {
  const moveUpLabel = reorder ? `Move ${reorder.sectionLabel} up` : undefined;
  const moveDownLabel = reorder ? `Move ${reorder.sectionLabel} down` : undefined;
  const hasRail = dates !== undefined;

  return (
    <article
      className={cn(
        'surface-soft text-card-foreground group/entry relative flex gap-2 py-4 pl-2 pr-4 sm:pl-3',
        isDragging && 'ring-primary/40 opacity-70 ring-2',
      )}
    >
      {reorder?.dragHandleProps ? (
        <button
          type="button"
          className="text-muted-foreground/70 hover:text-foreground hover:bg-secondary focus-visible:ring-ring/40 -my-1 flex w-6 shrink-0 cursor-grab touch-none items-start justify-center rounded-md pt-1.5 focus-visible:outline-none focus-visible:ring-2 active:cursor-grabbing"
          aria-label={`Reorder ${reorder.sectionLabel}`}
          {...reorder.dragHandleProps}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : (
        <span aria-hidden className="w-1 shrink-0 sm:w-2" />
      )}

      <div
        className={cn(
          'min-w-0 flex-1',
          hasRail && 'sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-x-5',
        )}
      >
        {hasRail ? (
          <p className="text-muted-foreground mb-1 text-[0.8125rem] tabular-nums leading-6 sm:mb-0">
            {dates || <span className="italic">No dates</span>}
          </p>
        ) : null}

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-0.5">
              <div className="text-[0.9375rem] font-semibold leading-6">{title}</div>
              {subtitle ? (
                <p className="text-foreground/80 text-sm leading-snug">{subtitle}</p>
              ) : null}
              {meta ? (
                <div className="text-muted-foreground mt-0.5 text-[0.8125rem] leading-snug">
                  {meta}
                </div>
              ) : null}
            </div>

            <div className="-mr-1.5 flex shrink-0 flex-wrap items-center justify-end gap-0.5">
              {reorder ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={iconButtonClassName}
                    aria-label={moveUpLabel}
                    title="Move up"
                    disabled={!reorder.canMoveUp}
                    onClick={reorder.onMoveUp}
                  >
                    <ChevronUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={iconButtonClassName}
                    aria-label={moveDownLabel}
                    title="Move down"
                    disabled={!reorder.canMoveDown}
                    onClick={reorder.onMoveDown}
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </Button>
                </>
              ) : null}
              {secondaryAction ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                >
                  {secondaryAction.label}
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" className="ml-1" onClick={onEdit}>
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
              {onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive size-8 px-0"
                  aria-label="Delete"
                  title="Delete"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>

          {children ? (
            <div className="mt-2 max-w-[75ch] text-sm leading-relaxed">{children}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

interface EntryFormShellProps {
  title: string;
  formRef: RefObject<HTMLFormElement | null>;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
  saving: boolean;
  error?: string | null;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Card that holds an entry form: a title, the fields, and a Save / Cancel bar
 * that sticks to the bottom of the viewport while the form is taller than it.
 */
function EntryFormShell({
  title,
  formRef,
  ariaLabel,
  className,
  children,
  saving,
  error,
  saveLabel,
  onSave,
  onCancel,
}: EntryFormShellProps) {
  return (
    <form
      ref={formRef}
      aria-label={ariaLabel ?? title}
      className={cn(
        'bg-card text-card-foreground ring-primary/50 rounded-lg shadow-[0_8px_24px_-12px_hsl(var(--shadow-ink)/0.18)] ring-1',
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) {
          onSave();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !saving) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="border-border/70 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h3 className="wide text-[0.9375rem]">{title}</h3>
        <span className="text-muted-foreground hidden text-xs sm:inline">Esc to cancel</span>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-5">{children}</div>
      <div className="bg-card/95 border-border/70 sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-b-lg border-t px-4 py-3 backdrop-blur sm:px-5">
        {error ? (
          <p role="alert" className="text-destructive mr-auto text-sm">
            {error}
          </p>
        ) : null}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface ResumeItemFormProps {
  children: ReactNode;
  /** Heading of the form card, e.g. "Edit work entry". */
  title?: string;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ResumeItemForm({
  children,
  title = 'Edit entry',
  saving = false,
  error,
  onSave,
  onCancel,
}: ResumeItemFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    scheduleScrollAndFocusSectionForm(formRef.current);
  }, []);

  return (
    <EntryFormShell
      title={title}
      formRef={formRef}
      saving={saving}
      error={error}
      saveLabel="Save"
      onSave={onSave}
      onCancel={onCancel}
    >
      {children}
    </EntryFormShell>
  );
}

interface SectionCreateFormProps {
  label: string;
  /** Heading of the open form, e.g. "New work entry". Defaults to `label`. */
  title?: string;
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function SectionCreateForm({
  label,
  title,
  open,
  onOpen,
  children,
  saving = false,
  error,
  onSave,
  onCancel,
}: SectionCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    scheduleScrollAndFocusSectionForm(formRef.current);
  }, [open]);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={onOpen}>
        <Plus className="size-4" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <EntryFormShell
      title={title ?? label}
      ariaLabel={label}
      formRef={formRef}
      saving={saving}
      error={error}
      saveLabel="Save"
      onSave={onSave}
      onCancel={onCancel}
    >
      {children}
    </EntryFormShell>
  );
}
