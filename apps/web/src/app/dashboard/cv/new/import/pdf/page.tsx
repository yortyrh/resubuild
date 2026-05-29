'use client';

import { ImportPdfCvForm } from '@/components/cv/import-pdf-cv-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportPdfPage() {
  const { navigateToEditor, handleCancel } = useNewCvHandlers();

  return <ImportPdfCvForm onSuccess={navigateToEditor} onCancel={handleCancel} />;
}
