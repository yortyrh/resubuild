'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { JobApplicationStatus, JobApplicationSummary } from '@/lib/api';
import {
  ApplicationActionsMenu,
  actionLabel,
  StatusBadge,
  UpdatingIndicator,
} from './application-row-display';

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

export interface ApplicationRowActions {
  onUpdate: (row: ApplicationRow) => void;
  onDelete: (row: ApplicationRow) => void;
  onExportCvPdf: (row: ApplicationRow) => void;
  onExportLetterPdf: (row: ApplicationRow) => void;
  onPreviewCv: (row: ApplicationRow) => void;
  exportingCvPdfFor: string | null;
  exportingLetterPdfFor: string | null;
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
        return (
          <div className="flex flex-nowrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
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
            <ApplicationActionsMenu row={app} actions={actions} />
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
