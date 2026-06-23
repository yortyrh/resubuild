import { CvSectionContent } from '@/components/cv/cv-section-content';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import { Skeleton } from '@/components/ui/skeleton';

interface CvEditorSkeletonProps {
  section?: CvSectionSlug;
}

function CvEditorBreadcrumbSkeleton({ section }: { section: CvSectionSlug }) {
  const showSectionSegment = section !== 'basics';

  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2.5"
    >
      <Skeleton className="h-4 w-16" />
      <Skeleton className="size-3.5 shrink-0 rounded-sm" />
      <Skeleton className="h-4 w-36 max-w-[45vw] sm:w-56" />
      {showSectionSegment ? (
        <>
          <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : null}
    </div>
  );
}

function CvBasicsSectionSkeleton() {
  return (
    <article aria-hidden="true" className="surface-soft text-card-foreground p-4">
      <div className="flex gap-4">
        <Skeleton className="size-20 shrink-0 rounded-md border border-dashed" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-40 max-w-full" />
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="divider-soft mt-4 flex gap-2 border-t pt-4">
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>
    </article>
  );
}

export function CvGenericSectionSkeleton() {
  return (
    <article aria-hidden="true" className="surface-soft text-card-foreground p-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-32 max-w-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="divider-soft mt-4 flex gap-2 border-t pt-4">
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>
    </article>
  );
}

export function CvSectionSkeleton({ section = 'basics' }: CvEditorSkeletonProps) {
  return section === 'basics' ? <CvBasicsSectionSkeleton /> : <CvGenericSectionSkeleton />;
}

export function CvEditorSkeleton({ section = 'basics' }: CvEditorSkeletonProps) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading CV">
      <div className="mt-2 flex items-center gap-x-0">
        <CvEditorBreadcrumbSkeleton section={section} />
      </div>
      <CvSectionContent>
        <CvSectionSkeleton section={section} />
      </CvSectionContent>
    </div>
  );
}
