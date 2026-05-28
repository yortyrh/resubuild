import type { ReactNode } from 'react';
import { CvLayoutShell } from '@/components/cv/cv-layout-shell';

export default async function CvEditorLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;

  return <CvLayoutShell cvId={id}>{children}</CvLayoutShell>;
}
