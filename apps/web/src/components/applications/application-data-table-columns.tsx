'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Eye, FileDown, FileText, Loader2, MoreVertical, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { JobApplicationStatus, JobApplicationSummary } from '@/lib/api';

/**
 * Row data shape consumed by the applications data table. Decoupled from
 * `JobApplicationSummary` so column definitions stay a pure presentation
 * concern: the list page adapts the API row into this shape.
 */
export interface ApplicationRow {
  id: string;
  company: string | null;
  position: string | null;
  status: JobApplicationStatus;
  updateInProgress: boolean;
  raw: JobApplicationSummary;
}

const STATUS_LABEL: Record<JobApplicationStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_DOT_CLASS: Record<JobApplicationStatus, string> = {
  queued: 'bg-muted-foreground/60',
  running: 'bg-amber-500',
  ready: 'bg-emerald-500',
  failed: 'bg-destructive',
};

function StatusBadge({ status }: { status: JobApplicationStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm capitalize">
      <span
        aria-hidden="true"
        className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

function UpdatingIndicator() {
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

export interface ApplicationRowActions {
  onUpdate: (row: ApplicationRow) => void;
  onDelete: (row: ApplicationRow) => void;
  onExportCvPdf: (row: ApplicationRow) => void;
  onExportLetterPdf: (row: ApplicationRow) => void;
  onPreviewCv: (row: ApplicationRow) => void;
  exportingCvPdfFor: string | null;
  exportingLetterPdfFor: string | null;
}

function actionLabel(application: ApplicationRow, verb: 'Update' | 'Delete' | 'Open') {
  if (application.position) {
    return `${verb} ${application.position} application`;
  }
  return `${verb} application`;
}

function menuTriggerLabel(application: ApplicationRow) {
  return actionLabel(application, 'Open');
}

export function getApplicationColumns(actions: ApplicationRowActions): ColumnDef<ApplicationRow>[] {
  return [
    {
      id: 'company',
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <Link
            href={`/dashboard/applications/${app.id}`}
            className="text-primary decoration-primary/30 hover:decoration-primary focus-visible:ring-ring block max-w-[16rem] truncate rounded-sm font-medium underline underline-offset-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {app.company ?? '—'}
          </Link>
        );
      },
    },
    {
      id: 'position',
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <Link
            href={`/dashboard/applications/${app.id}`}
            className="text-muted-foreground hover:text-foreground decoration-muted-foreground/30 hover:decoration-foreground/60 focus-visible:ring-ring block max-w-[20rem] truncate rounded-sm text-sm underline underline-offset-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {app.position ?? 'Preparing…'}
          </Link>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Application status',
      cell: ({ row }) => {
        const app = row.original;
        return app.updateInProgress ? <UpdatingIndicator /> : <StatusBadge status={app.status} />;
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const app = row.original;
        const hasTailoredCv = Boolean(app.raw.tailoredCvId);
        const isExportingCvPdf = actions.exportingCvPdfFor === app.id;
        const isExportingLetterPdf = actions.exportingLetterPdfFor === app.id;
        const anyExportInFlight = isExportingCvPdf || isExportingLetterPdf;
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={app.updateInProgress}
              onClick={() => actions.onUpdate(app)}
              aria-label={actionLabel(app, 'Update')}
            >
              {app.updateInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {app.updateInProgress ? 'Updating…' : 'Update'}
            </Button>
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
                  {isExportingLetterPdf
                    ? 'Exporting cover letter PDF…'
                    : 'Export cover letter as PDF'}
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
          </div>
        );
      },
    },
  ];
}

export function toApplicationRow(application: JobApplicationSummary): ApplicationRow {
  return {
    id: application.id,
    company: application.jobCompany ?? null,
    position: application.jobTitle ?? null,
    status: application.status,
    updateInProgress: Boolean(application.updateInProgress),
    raw: application,
  };
}
