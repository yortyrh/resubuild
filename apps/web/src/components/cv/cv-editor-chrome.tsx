'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { CvEditorBreadcrumb } from '@/components/cv/cv-editor-breadcrumb';
import { CvEditorHeaderActions } from '@/components/cv/cv-editor-header-actions';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import { CvSectionContent } from '@/components/cv/cv-section-content';
import { CvSectionLayout, CvSectionNavToggle } from '@/components/cv/cv-section-layout';
import { resolveActiveSectionFromPathname } from '@/components/cv/cv-section-nav';

interface CvEditorChromeProps {
  cvId: string;
  children: ReactNode;
}

export function CvEditorChrome({ cvId, children }: CvEditorChromeProps) {
  const pathname = usePathname();
  const activeSection = resolveActiveSectionFromPathname(pathname);
  const { resume, error, loading, mountedSection } = useCvEditor();

  // The URL has moved on but the new section hasn't reported its mount yet:
  // the previous page is still rendered as children, so cover it with the
  // destination skeleton until the new section's useSectionMount fires.
  const isNavigating = mountedSection !== null && mountedSection !== activeSection;
  const showSkeleton = loading || isNavigating;

  return (
    <CvSectionLayout cvId={cvId}>
      <div className="space-y-6">
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-x-2">
            <CvSectionNavToggle />
            <CvEditorBreadcrumb
              cvId={cvId}
              basics={resume.basics}
              activeSection={activeSection}
              className="mt-0 min-w-0 flex-1"
            />
          </div>
          <CvEditorHeaderActions cvId={cvId} className="no-print w-full sm:ml-auto sm:w-auto" />
        </div>
        <CvSectionContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <>
              {showSkeleton ? (
                <div role="status" aria-busy="true" aria-label="Loading section">
                  <CvSectionSkeleton section={activeSection} />
                </div>
              ) : null}
              {/*
                Keep children mounted at all times so the destination page can
                announce its mount via useSectionMount. We just hide it visually
                while the skeleton is shown.
              */}
              <div hidden={showSkeleton}>{children}</div>
            </>
          )}
        </CvSectionContent>
      </div>
    </CvSectionLayout>
  );
}
