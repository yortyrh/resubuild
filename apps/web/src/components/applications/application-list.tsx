'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { DeleteItemDialog } from '@/components/cv/cv-item-ui';
import { Button } from '@/components/ui/button';
import { deleteApplication, type JobApplicationSummary, listApplications } from '@/lib/api';

function formatStatus(status: JobApplicationSummary['status']) {
  return status.replace('_', ' ');
}

function formatApplicationLabel(app: JobApplicationSummary) {
  const title = app.jobTitle ?? 'Preparing…';
  return app.jobCompany ? `${title} · ${app.jobCompany}` : title;
}

export function ApplicationList() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      toast.success('Application deleted');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete application');
    },
  });

  const pendingDelete = deleteId ? data.find((app) => app.id === deleteId) : undefined;

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    await deleteMutation.mutateAsync(deleteId);
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading applications…</p>;
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : 'Failed to load applications'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Button asChild>
          <Link href="/dashboard/applications/new">Prepare application</Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">No applications yet.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((app) => (
            <li
              key={app.id}
              className="surface-soft text-card-foreground flex items-center justify-between gap-4 p-4"
            >
              <Link
                href={`/dashboard/applications/${app.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="font-medium">{formatApplicationLabel(app)}</div>
                <div className="text-muted-foreground text-sm capitalize">
                  {formatStatus(app.status)}
                </div>
              </Link>
              <Button size="sm" variant="destructive" onClick={() => setDeleteId(app.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DeleteItemDialog
        open={deleteId !== null}
        title="Delete application?"
        description={
          pendingDelete
            ? `"${formatApplicationLabel(pendingDelete)}" will be permanently removed. This cannot be undone.`
            : 'This application will be permanently removed. This cannot be undone.'
        }
        confirming={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteMutation.isPending) {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
