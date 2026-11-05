'use client';

import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react';
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
      className="bg-background text-foreground ring-border fixed left-1/2 top-1/2 w-[min(100%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-[0_24px_48px_-12px_hsl(218_15%_10%/0.3)] ring-1 backdrop:bg-[hsl(218_15%_10%/0.55)] backdrop:backdrop-blur-[2px]"
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
      className="bg-background text-foreground ring-border fixed left-1/2 top-1/2 w-[min(100%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-[0_24px_48px_-12px_hsl(218_15%_10%/0.3)] ring-1 backdrop:bg-[hsl(218_15%_10%/0.55)] backdrop:backdrop-blur-[2px]"
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
  meta?: ReactNode;
  children?: ReactNode;
  onEdit: () => void;
  onDelete?: () => void;
  secondaryAction?: ResumeItemSecondaryAction;
  reorder?: ResumeItemRowReorderProps;
  isDragging?: boolean;
}

export function ResumeItemRow({
  title,
  subtitle,
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

  return (
    <article
      className={cn(
        'cv-entry group/entry relative -mx-3 rounded-md px-3 py-2.5 transition-colors',
        'focus-within:bg-[hsl(var(--primary)/0.035)] hover:bg-[hsl(var(--primary)/0.035)]',
        isDragging && 'ring-primary/30 bg-page opacity-70 ring-2',
      )}
    >
      <div className="flex items-start gap-2">
        {reorder?.dragHandleProps ? (
          <button
            type="button"
            className="text-page-ink-muted hover:text-page-ink -ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded-sm active:cursor-grabbing"
            aria-label={`Reorder ${reorder.sectionLabel}`}
            {...reorder.dragHandleProps}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-x-6 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0">
              <div className="font-bold">{title}</div>
              {subtitle ? <div className="italic leading-snug">{subtitle}</div> : null}
            </div>
            {meta ? (
              <div className="text-page-ink-muted shrink-0 text-[0.875rem] tabular-nums sm:text-right">
                {meta}
              </div>
            ) : null}
          </div>
          {children ? <div className="mt-1">{children}</div> : null}
        </div>
      </div>
      <div className="cv-entry-actions mt-1.5 flex flex-wrap items-center gap-1 font-sans">
        {reorder ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              aria-label={moveUpLabel}
              disabled={!reorder.canMoveUp}
              onClick={reorder.onMoveUp}
            >
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              aria-label={moveDownLabel}
              disabled={!reorder.canMoveDown}
              onClick={reorder.onMoveDown}
            >
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        {secondaryAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-auto"
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}

interface ResumeItemFormProps {
  children: ReactNode;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

function ComposerActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="border-page-rule flex items-center justify-between gap-3 border-t px-3 py-2.5 font-sans sm:px-4">
      <p className="text-page-ink-muted hidden text-xs sm:block">
        Enter starts a new bullet. Markdown like **bold** shows in the PDF.
      </p>
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

const composerFormClassName =
  'cv-entry-form composer bg-page ring-primary/45 -mx-3 rounded-md ring-2 sm:-mx-4';

export function ResumeItemForm({
  children,
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
    <form
      ref={formRef}
      className={composerFormClassName}
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
      <div className="space-y-2 px-3 pb-3 pt-5 sm:px-4">{children}</div>
      {error ? <p className="text-destructive px-4 pb-2 font-sans text-sm">{error}</p> : null}
      <ComposerActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

interface SectionCreateFormProps {
  label: string;
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
      <button
        type="button"
        onClick={onOpen}
        className="cv-add-entry text-page-ink-muted hover:text-primary hover:border-primary/50 focus-visible:ring-primary/30 border-page-rule mt-3 flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-3 font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <Plus className="size-4" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      aria-label={label}
      className={cn(composerFormClassName, 'mt-3')}
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
      <div className="space-y-2 px-3 pb-3 pt-5 sm:px-4">{children}</div>
      {error ? <p className="text-destructive px-4 pb-2 font-sans text-sm">{error}</p> : null}
      <ComposerActions saving={saving} onCancel={onCancel} />
    </form>
  );
}
