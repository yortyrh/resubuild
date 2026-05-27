'use client';

import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const resumeItemActionsClassName = 'divider-soft mt-4 flex gap-2 border-t pt-4';

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
      className="bg-background ring-border/50 fixed left-1/2 top-1/2 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-lg ring-1 backdrop:bg-black/50"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
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
  reorder,
  isDragging = false,
}: ResumeItemRowProps) {
  const moveUpLabel = reorder ? `Move ${reorder.sectionLabel} up` : undefined;
  const moveDownLabel = reorder ? `Move ${reorder.sectionLabel} down` : undefined;

  return (
    <article
      className={`surface-soft text-card-foreground p-4 ${isDragging ? 'ring-primary/30 opacity-60 ring-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {reorder?.dragHandleProps ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Reorder ${reorder.sectionLabel}`}
            {...reorder.dragHandleProps}
          >
            <GripVertical className="size-5" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-muted-foreground mt-0 text-sm font-normal leading-snug">
              {subtitle}
            </div>
          ) : null}
        </div>
        {meta ? (
          <div className="text-muted-foreground shrink-0 text-right text-sm">{meta}</div>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
      <div className={resumeItemActionsClassName}>
        {reorder ? (
          <div className="mr-auto flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={moveUpLabel}
              disabled={!reorder.canMoveUp}
              onClick={reorder.onMoveUp}
            >
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={moveDownLabel}
              disabled={!reorder.canMoveDown}
              onClick={reorder.onMoveDown}
            >
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        {onDelete ? (
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
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

export function ResumeItemForm({
  children,
  saving = false,
  error,
  onSave,
  onCancel,
}: ResumeItemFormProps) {
  return (
    <form
      className="surface-soft text-card-foreground p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) {
          onSave();
        }
      }}
    >
      <div className="space-y-4">{children}</div>
      {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
      <div className={resumeItemActionsClassName}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
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
  if (!open) {
    return (
      <Button type="button" className="mt-4" onClick={onOpen}>
        {label}
      </Button>
    );
  }

  return (
    <form
      className="surface-soft text-card-foreground mt-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) {
          onSave();
        }
      }}
    >
      <h4 className="mb-4 text-base font-semibold">{label}</h4>
      <div className="space-y-4">{children}</div>
      {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
      <div className={resumeItemActionsClassName}>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
