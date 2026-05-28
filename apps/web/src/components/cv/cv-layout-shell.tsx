'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CvEditorChrome } from '@/components/cv/cv-editor-chrome';
import { CvEditorProvider } from '@/components/cv/cv-editor-provider';

interface CvLayoutShellProps {
  cvId: string;
  children: ReactNode;
}

/** Editor chrome for section routes; bare layout for preview/export. */
export function CvLayoutShell({ cvId, children }: CvLayoutShellProps) {
  const pathname = usePathname();
  const isPreview = pathname?.endsWith('/preview');

  if (isPreview) {
    return <>{children}</>;
  }

  return (
    <CvEditorProvider cvId={cvId}>
      <CvEditorChrome cvId={cvId}>{children}</CvEditorChrome>
    </CvEditorProvider>
  );
}
