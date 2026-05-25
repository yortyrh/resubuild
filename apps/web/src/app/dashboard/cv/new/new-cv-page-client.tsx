'use client';

import { createEmptyResume } from '@resumind/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createCv } from '@/lib/api';

export function NewCvPageClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createCv({ title: 'Untitled CV', data: createEmptyResume() as Record<string, unknown> })
      .then((created) => {
        router.replace(`/dashboard/cv/${created.id}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to create CV');
      });
  }, [router]);

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return <p className="text-muted-foreground">Creating your CV…</p>;
}
