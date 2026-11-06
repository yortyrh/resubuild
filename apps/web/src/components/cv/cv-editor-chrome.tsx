'use client';

import type { Resume } from '@resubuild/types';
import { PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { CvApplicationPromoteButton } from '@/components/cv/cv-application-promote-button';
import { CvEditorHeaderActions } from '@/components/cv/cv-editor-header-actions';
import { useCvEditor } from '@/components/cv/cv-editor-provider';
import { CvSectionSkeleton } from '@/components/cv/cv-editor-skeleton';
import { CvSectionContent } from '@/components/cv/cv-section-content';
import {
  getSectionDescription,
  getSectionLabel,
  resolveActiveSectionFromPathname,
} from '@/components/cv/cv-section-nav';
import { CvSectionNav } from '@/components/cv/cv-section-nav-links';
import { useApplicationForCv } from '@/components/cv/use-application-for-cv';
import { useDashboardBreadcrumb } from '@/components/dashboard/dashboard-breadcrumb-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useCv } from '@/lib/queries/cv-queries';

interface CvEditorChromeProps {
  cvId: string;
  children: ReactNode;
}

export function CvEditorChrome({ cvId, children }: CvEditorChromeProps) {
  const pathname = usePathname();
  const activeSection = resolveActiveSectionFromPathname(pathname);
  const { mountedSection } = useCvEditor();
  const { data: cv, isLoading: loading, error: queryError } = useCv(cvId);
  const basics = (cv?.data as Resume | undefined)?.basics ?? null;
  const error =
    queryError instanceof Error ? queryError.message : queryError ? 'Failed to load CV' : null;
  const application = useApplicationForCv(cvId);
  const { setBreadcrumb, reset } = useDashboardBreadcrumb();
  const [sectionsOpen, setSectionsOpen] = useState(false);

  // The URL has moved on but the new section hasn't reported its mount yet:
  // the previous page is still rendered as children, so cover it with the
  // destination skeleton until the new section's useSectionMount fires.
  const isNavigating = mountedSection !== null && mountedSection !== activeSection;
  const showSkeleton = loading || isNavigating;

  useEffect(() => {
    setBreadcrumb({
      variant: 'cv',
      cvId,
      basics: loading ? null : basics,
      activeSection,
      application,
    });
    return () => reset();
  }, [setBreadcrumb, reset, cvId, basics, activeSection, application, loading]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside aria-label="CV sections" className="hidden shrink-0 lg:block lg:w-52">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <CvSectionNav cvId={cvId} navState="expanded" density="comfortable" />
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="no-print flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[1.75rem]">{getSectionLabel(activeSection)}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {getSectionDescription(activeSection)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 shrink-0 lg:hidden"
            onClick={() => setSectionsOpen(true)}
            aria-label="Show sections"
            aria-expanded={sectionsOpen}
            aria-controls="cv-sections-drawer"
          >
            <PanelLeftOpen className="size-4 shrink-0 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">Sections</span>
          </Button>

          <div className="ml-auto mt-1 flex items-center gap-2">
            {application ? <CvApplicationPromoteButton application={application} /> : null}
            <CvEditorHeaderActions cvId={cvId} className="w-auto" />
          </div>
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

      <Sheet open={sectionsOpen} onOpenChange={setSectionsOpen}>
        <SheetContent
          id="cv-sections-drawer"
          side="left"
          className="scrollbar-hidden flex w-72 flex-col gap-3 overflow-y-auto px-2 py-4 sm:max-w-sm"
        >
          <SheetTitle className="sr-only">CV sections</SheetTitle>
          <SheetDescription className="sr-only">Navigate between CV sections.</SheetDescription>
          <CvSectionNav
            cvId={cvId}
            navState="expanded"
            density="comfortable"
            onSelect={() => setSectionsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
