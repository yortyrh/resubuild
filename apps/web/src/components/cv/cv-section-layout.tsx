import type { ReactNode } from 'react';

interface CvSectionLayoutProps {
  cvId: string;
  children: ReactNode;
}

export function CvSectionLayout({ cvId: _cvId, children }: CvSectionLayoutProps) {
  return <>{children}</>;
}
