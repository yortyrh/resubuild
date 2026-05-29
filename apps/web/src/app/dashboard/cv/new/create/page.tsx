'use client';

import { CreateCvForm } from '@/components/cv/create-cv-form';
import { useNewCvHandlers } from '@/lib/use-new-cv-handlers';

export default function CreateCvPage() {
  const { handleManualSave, handleCancel } = useNewCvHandlers();

  return <CreateCvForm onSave={handleManualSave} onCancel={handleCancel} />;
}
