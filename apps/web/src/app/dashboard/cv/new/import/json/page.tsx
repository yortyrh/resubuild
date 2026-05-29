'use client';

import { ImportCvForm } from '@/components/cv/import-cv-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportJsonPage() {
  const { handleImport, handleCancel } = useNewCvHandlers();

  return <ImportCvForm onImport={handleImport} onCancel={handleCancel} />;
}
