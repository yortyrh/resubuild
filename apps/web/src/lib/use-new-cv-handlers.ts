'use client';

import { createEmptyResume } from '@resumind/types';
import { useRouter } from 'next/navigation';
import { resolveImportedResumeData } from '@/lib/import-cv-media';
import { useCreateCv } from '@/lib/queries/cv-mutations';

type Basics = NonNullable<ReturnType<typeof createEmptyResume>['basics']>;

export function useNewCvHandlers() {
  const router = useRouter();
  const createCvMutation = useCreateCv();

  const navigateToEditor = (id: string) => {
    router.replace(`/dashboard/cv/${id}`);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const handleManualSave = async ({ basics }: { basics: Basics }) => {
    const created = await createCvMutation.mutateAsync({
      data: { ...createEmptyResume(), basics } as Record<string, unknown>,
    });
    navigateToEditor(created.id);
  };

  const handleImport = async ({
    data,
    useGravatar,
  }: {
    data: Record<string, unknown>;
    useGravatar: boolean;
  }) => {
    const resolved = await resolveImportedResumeData(data, { useGravatar });
    const created = await createCvMutation.mutateAsync({ data: resolved });
    navigateToEditor(created.id);
  };

  return {
    navigateToEditor,
    handleCancel,
    handleManualSave,
    handleImport,
  };
}
