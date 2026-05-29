'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DeleteItemDialog } from '@/components/cv/cv-item-ui';
import { CvListSkeleton } from '@/components/dashboard/cv-list-skeleton';
import { Button } from '@/components/ui/button';
import { useDeleteCv } from '@/lib/queries/cv-mutations';
import { useCvList } from '@/lib/queries/cv-queries';

export function CvList() {
  const { data: cvs = [], isLoading, error } = useCvList();
  const deleteCvMutation = useDeleteCv();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pendingDelete = deleteId ? cvs.find((cv) => cv.id === deleteId) : undefined;

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await deleteCvMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Toast handled in mutation hook.
    }
  };

  if (isLoading) {
    return <CvListSkeleton />;
  }

  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : 'Failed to load CVs'}
      </p>
    );
  }

  if (cvs.length === 0) {
    return (
      <article className="surface-soft text-card-foreground p-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">No CVs yet</div>
          <div className="text-muted-foreground mt-0 text-sm font-normal leading-snug">
            Create your first Resumind CV.
          </div>
        </div>
        <div className="divider-soft mt-4 flex gap-2 border-t pt-4">
          <Button asChild>
            <Link href="/dashboard/cv/new">Create CV</Link>
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My CVs</h1>
          <p className="text-muted-foreground">
            Create and edit CVs that follow the JSON Resume schema.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cv/new">New CV</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cvs.map((cv) => (
          <article key={cv.id} className="surface-soft text-card-foreground p-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/cv/${cv.id}`}
                className="focus-visible:ring-ring rounded-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2"
              >
                {cv.title}
              </Link>
              <div className="text-muted-foreground mt-0 text-sm font-normal leading-snug">
                Updated {new Date(cv.updated_at).toLocaleString()}
              </div>
            </div>
            <div className="divider-soft mt-4 flex gap-2 border-t pt-4">
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/cv/${cv.id}`}>Edit</Link>
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteId(cv.id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}

        <DeleteItemDialog
          open={deleteId !== null}
          title="Delete CV?"
          description={
            pendingDelete
              ? `"${pendingDelete.title}" will be permanently removed. This cannot be undone.`
              : 'This CV will be permanently removed. This cannot be undone.'
          }
          confirming={deleteCvMutation.isPending}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!deleteCvMutation.isPending) {
              setDeleteId(null);
            }
          }}
        />
      </div>
    </div>
  );
}
