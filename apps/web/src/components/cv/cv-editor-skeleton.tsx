import { CvSectionContent } from '@/components/cv/cv-section-content';
import { CV_SECTIONS, type CvSectionSlug } from '@/components/cv/cv-section-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const NAV_LABEL_WIDTHS = [
  'w-12',
  'w-24',
  'w-10',
  'w-16',
  'w-20',
  'w-11',
  'w-16',
  'w-12',
  'w-20',
  'w-20',
  'w-20',
  'w-16',
  'w-20',
] as const;

interface CvEditorSkeletonProps {
  section?: CvSectionSlug;
}

function CvSectionNavSkeleton({ activeIndex }: { activeIndex: number }) {
  return (
    <nav aria-hidden="true" className="flex flex-col gap-0.5">
      {CV_SECTIONS.map(({ slug }, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={slug}
            className={cn(
              'flex items-center rounded-md',
              'mx-auto size-10 justify-center px-0',
              'md:mx-0 md:size-auto md:w-full md:justify-start md:gap-2.5 md:px-3 md:py-2',
              isActive && 'bg-accent/40',
            )}
          >
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton className={cn('hidden h-4 md:block', NAV_LABEL_WIDTHS[index] ?? 'w-16')} />
          </div>
        );
      })}
    </nav>
  );
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

function CvGenericSectionSkeleton() {
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
  const activeIndex = Math.max(
    0,
    CV_SECTIONS.findIndex(({ slug }) => slug === section),
  );

  return (
    <div className="flex gap-2" role="status" aria-busy="true" aria-label="Loading CV">
      <aside
        aria-hidden="true"
        className="w-12 shrink-0 transition-[width] duration-200 ease-in-out md:w-48"
      >
        <div className="sticky top-6 flex flex-col gap-1">
          <CvSectionNavSkeleton activeIndex={activeIndex} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="space-y-6">
          <div className="mt-2 flex items-center gap-x-0">
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <CvEditorBreadcrumbSkeleton section={section} />
          </div>
          <CvSectionContent>
            <CvSectionSkeleton section={section} />
          </CvSectionContent>
        </div>
      </div>
    </div>
  );
}
