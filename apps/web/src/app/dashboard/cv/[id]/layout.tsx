import type { ReactNode } from 'react';
import { CvEditorChrome } from '@/components/cv/cv-editor-chrome';
import { CvEditorProvider } from '@/components/cv/cv-editor-provider';

export default async function CvEditorLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;

  return (
    <CvEditorProvider cvId={id}>
      <CvEditorChrome cvId={id}>{children}</CvEditorChrome>
    </CvEditorProvider>
  );
}
