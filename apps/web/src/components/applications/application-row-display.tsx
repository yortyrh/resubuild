'use client';

import { Eye, FileDown, FileText, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ApplicationRow, ApplicationRowActions } from './application-data-table-columns';

const STATUS_LABEL: Record<ApplicationRow['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_DOT_CLASS: Record<ApplicationRow['status'], string> = {
  queued: 'bg-muted-foreground/60',
  running: 'bg-amber-500',
  ready: 'bg-emerald-500',
  failed: 'bg-destructive',
};

export function StatusBadge({ status }: { status: ApplicationRow['status'] }) {
  return (
    <span className="text-foreground/80 inline-flex items-center gap-2 text-sm capitalize">
      <span
        aria-hidden="true"
        className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function UpdatingIndicator() {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm text-amber-600"
      aria-label="Update in progress"
    >
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      Updating…
    </span>
  );
}

export function actionLabel(application: ApplicationRow, verb: 'Update' | 'Delete' | 'Open') {
  if (application.position) {
    return `${verb} ${application.position} application`;
  }
  return `${verb} application`;
}

export function menuTriggerLabel(application: ApplicationRow) {
  return actionLabel(application, 'Open');
}

/**
 * Three-dots row actions menu shared by the table cell and the mobile card.
 * Keeps the four row actions (export CV PDF, export cover letter PDF,
 * preview CV, delete) consistent across both layouts.
 */
export function ApplicationActionsMenu({
  row,
  actions,
}: {
  row: ApplicationRow;
  actions: ApplicationRowActions;
}) {
  const app = row;
  const hasTailoredCv = Boolean(app.raw.tailoredCvId);
  const isExportingCvPdf = actions.exportingCvPdfFor === app.id;
  const isExportingLetterPdf = actions.exportingLetterPdfFor === app.id;
  const anyExportInFlight = isExportingCvPdf || isExportingLetterPdf;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={menuTriggerLabel(app)}
          className="text-muted-foreground shrink-0"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!hasTailoredCv || anyExportInFlight}
          onClick={() => actions.onExportCvPdf(app)}
          className="flex items-center gap-2"
        >
          {isExportingCvPdf ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="size-4" aria-hidden="true" />
          )}
          {isExportingCvPdf ? 'Exporting CV PDF…' : 'Export CV as PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={anyExportInFlight}
          onClick={() => actions.onExportLetterPdf(app)}
          className="flex items-center gap-2"
        >
          {isExportingLetterPdf ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileDown className="size-4" aria-hidden="true" />
          )}
          {isExportingLetterPdf ? 'Exporting cover letter PDF…' : 'Export cover letter as PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasTailoredCv}
          onClick={() => actions.onPreviewCv(app)}
          className="flex items-center gap-2"
        >
          <Eye className="size-4" aria-hidden="true" />
          Preview CV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => actions.onDelete(app)}
          className="text-destructive focus:text-destructive flex items-center gap-2"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
