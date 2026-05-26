'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DeleteItemDialog } from '@/components/cv/cv-item-ui';
import { CvListSkeleton } from '@/components/dashboard/cv-list-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CvRecord } from '@/lib/api';
import { deleteCv, listCvs } from '@/lib/api';

export function CvList() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CvRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCvs = () =>
    listCvs()
      .then(setCvs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load CVs'))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadCvs();
  }, [loadCvs]);

  const pendingDelete = deleteId ? cvs.find((cv) => cv.id === deleteId) : undefined;

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCv(deleteId);
      toast.success('CV deleted');
      setDeleteId(null);
      await loadCvs();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete CV');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <CvListSkeleton />;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (cvs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No CVs yet</CardTitle>
          <CardDescription>Create your first Resumind CV.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/cv/new">Create CV</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cvs.map((cv) => (
        <article key={cv.id} className="surface-soft text-card-foreground p-4">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{cv.title}</div>
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
        confirming={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
