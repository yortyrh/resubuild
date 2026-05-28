'use client';

import { createEmptyResume } from '@resumind/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreateCvForm } from '@/components/cv/create-cv-form';
import { ImportCvForm } from '@/components/cv/import-cv-form';
import { ImportPdfCvForm } from '@/components/cv/import-pdf-cv-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resolveImportedResumeData } from '@/lib/import-cv-media';
import { useCreateCv } from '@/lib/queries/cv-mutations';

type Basics = NonNullable<ReturnType<typeof createEmptyResume>['basics']>;

export function NewCvPageClient() {
  const router = useRouter();
  const createCvMutation = useCreateCv();
  const [activeTab, setActiveTab] = useState('import-pdf');

  const navigateToEditor = (id: string) => {
    router.replace(`/dashboard/cv/${id}`);
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

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="import-pdf">Import PDF</TabsTrigger>
        <TabsTrigger value="manual">Create manually</TabsTrigger>
        <TabsTrigger value="import">Import JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="import-pdf" className="mt-6">
        <ImportPdfCvForm onSuccess={navigateToEditor} onCancel={handleCancel} />
      </TabsContent>
      <TabsContent value="manual" className="mt-6">
        <CreateCvForm onSave={handleManualSave} onCancel={handleCancel} />
      </TabsContent>
      <TabsContent value="import" className="mt-6">
        <ImportCvForm onImport={handleImport} onCancel={handleCancel} />
      </TabsContent>
    </Tabs>
  );
}
