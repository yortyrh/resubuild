'use client';

import { ImportWebsiteForm } from '@/components/cv/import-website-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportWebsitePage() {
  const { handleImport, handleCancel } = useNewCvHandlers();

  return <ImportWebsiteForm onImport={handleImport} onCancel={handleCancel} />;
}
