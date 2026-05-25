'use client';

import { createEmptyResume } from '@resumind/types';
import { useRouter } from 'next/navigation';
import { CreateCvForm } from '@/components/cv/create-cv-form';
import { createCv } from '@/lib/api';

export function NewCvPageClient() {
  const router = useRouter();

  const handleSave = async ({
    basics,
  }: {
    basics: NonNullable<ReturnType<typeof createEmptyResume>['basics']>;
  }) => {
    const created = await createCv({
      data: { ...createEmptyResume(), basics } as Record<string, unknown>,
    });
    router.replace(`/dashboard/cv/${created.id}`);
  };

  return <CreateCvForm onSave={handleSave} onCancel={() => router.push('/dashboard')} />;
}
