'use client';

import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ApplicationRow, ApplicationRowActions } from './application-data-table-columns';
import {
  ApplicationActionsMenu,
  actionLabel,
  StatusBadge,
  UpdatingIndicator,
} from './application-row-display';

/**
 * Mobile-friendly card layout for a single application row. Rendered below
 * the `md` breakpoint via the `renderCard` slot on the data table; mirrors
 * the chrome and status/UX of the table row on `md+`.
 */
export function ApplicationRowCard({
  row,
  actions,
}: {
  row: ApplicationRow;
  actions: ApplicationRowActions;
}) {
  const app = row;
  const detailHref = `/dashboard/applications/${app.id}`;

  return (
    <article data-testid="application-row-card" className="surface-soft text-card-foreground p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={detailHref}
            className="text-primary decoration-primary/30 hover:decoration-primary focus-visible:ring-ring block max-w-full truncate rounded-sm text-base font-semibold underline underline-offset-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {app.company ?? '—'}
          </Link>
          <Link
            href={detailHref}
            className="text-muted-foreground hover:text-foreground decoration-muted-foreground/30 hover:decoration-foreground/60 focus-visible:ring-ring block max-w-full truncate rounded-sm text-sm underline underline-offset-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {app.position ?? 'Preparing…'}
          </Link>
        </div>
        <ApplicationActionsMenu row={app} actions={actions} />
      </div>
      <div className="divider-soft mt-4 flex items-center justify-between gap-3 border-t pt-3">
        {app.updateInProgress ? <UpdatingIndicator /> : <StatusBadge status={app.status} />}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 sm:flex-none"
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
      </div>
    </article>
  );
}
