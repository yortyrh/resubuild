'use client';

import { ImportFileForm } from '@/components/cv/import-file-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportFilePage() {
  const { handleImport, handleCancel } = useNewCvHandlers();

  return <ImportFileForm onImport={handleImport} onCancel={handleCancel} />;
}
