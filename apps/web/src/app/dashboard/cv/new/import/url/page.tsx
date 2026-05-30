'use client';

import { ImportUrlForm } from '@/components/cv/import-url-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportUrlPage() {
  const { handleImport, handleCancel } = useNewCvHandlers();

  return <ImportUrlForm onImport={handleImport} onCancel={handleCancel} />;
}
