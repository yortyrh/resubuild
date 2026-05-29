'use client';

import { ImportMarkdownCvForm } from '@/components/cv/import-markdown-cv-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function ImportMarkdownPage() {
  const { navigateToEditor, handleCancel } = useNewCvHandlers();

  return <ImportMarkdownCvForm onSuccess={navigateToEditor} onCancel={handleCancel} />;
}
