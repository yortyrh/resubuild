'use client';

import { createEmptyResume } from '@resumind/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreateCvForm } from '@/components/cv/create-cv-form';
import { ImportCvForm } from '@/components/cv/import-cv-form';
import { ImportPdfCvForm } from '@/components/cv/import-pdf-cv-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createCv } from '@/lib/api';
import { resolveImportedResumeData } from '@/lib/import-cv-media';

type Basics = NonNullable<ReturnType<typeof createEmptyResume>['basics']>;

export function NewCvPageClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('manual');

  const navigateToEditor = (id: string) => {
    router.replace(`/dashboard/cv/${id}`);
  };

  const handleManualSave = async ({ basics }: { basics: Basics }) => {
    const created = await createCv({
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
    const created = await createCv({ data: resolved });
    navigateToEditor(created.id);
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="manual">Create manually</TabsTrigger>
        <TabsTrigger value="import">Import JSON</TabsTrigger>
        <TabsTrigger value="import-pdf">Import PDF</TabsTrigger>
      </TabsList>
      <TabsContent value="manual" className="mt-6">
        <CreateCvForm onSave={handleManualSave} onCancel={handleCancel} />
      </TabsContent>
      <TabsContent value="import" className="mt-6">
        <ImportCvForm onImport={handleImport} onCancel={handleCancel} />
      </TabsContent>
      <TabsContent value="import-pdf" className="mt-6">
        <ImportPdfCvForm onSuccess={navigateToEditor} onCancel={handleCancel} />
      </TabsContent>
    </Tabs>
  );
}
