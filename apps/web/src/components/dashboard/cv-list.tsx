'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CvRecord } from '@/lib/api';
import { deleteCv, listCvs } from '@/lib/api';

export function CvList() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CvRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCvs = () =>
    listCvs()
      .then(setCvs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load CVs'))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadCvs();
  }, [loadCvs]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this CV?')) {
      return;
    }

    try {
      await deleteCv(id);
      toast.success('CV deleted');
      await loadCvs();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete CV');
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading CVs…</p>;
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
        <Card key={cv.id}>
          <CardHeader>
            <CardTitle>{cv.title}</CardTitle>
            <CardDescription>Updated {new Date(cv.updated_at).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href={`/dashboard/cv/${cv.id}`}>Edit</Link>
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(cv.id)}>
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
