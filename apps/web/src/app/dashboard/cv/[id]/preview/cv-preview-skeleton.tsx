import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function CvPreviewBreadcrumbSkeleton({ className }: { className?: string }) {
  return (
    <nav
      aria-busy="true"
      aria-label="Loading breadcrumb"
      className={cn('no-print mt-0', className)}
    >
      <div aria-hidden="true" className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="size-3.5 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-36 max-w-[45vw] sm:w-56" />
        <Skeleton className="size-3.5 shrink-0 rounded-sm" />
        <Skeleton className="h-4 w-20" />
      </div>
    </nav>
  );
}

export function CvLayoutPanelSkeleton({ className }: { className?: string }) {
  return (
    <aside
      aria-busy="true"
      aria-label="Loading layout panel"
      className={cn('no-print surface-soft w-48 shrink-0 space-y-3 p-3 text-sm', className)}
    >
      <Skeleton className="h-5 w-16" />

      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <ul className="space-y-1" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <li
              key={index}
              className="border-input/60 bg-background flex items-center gap-1 rounded-md border px-1.5 py-1"
            >
              <Skeleton className="size-3.5 shrink-0 rounded-sm" />
              <Skeleton className="h-3 min-w-0 flex-1" />
              <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <div className="grid gap-1.5">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="size-3.5 shrink-0 rounded-sm" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-1.5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="size-3.5 shrink-0 rounded-sm" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function CvPreviewDocumentSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading resume preview"
      className={cn(
        'surface-soft cv-export-preview flex min-h-[480px] w-full min-w-0 max-w-none flex-1 flex-col',
        className,
      )}
    >
      <div className="space-y-8 bg-white p-8 md:flex-1 md:p-10">
        <div className="space-y-3 border-b pb-6">
          <Skeleton className="h-9 w-2/5 max-w-xs" />
          <Skeleton className="h-5 w-3/5 max-w-sm" />
          <div className="flex flex-wrap gap-3 pt-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <div className="space-y-5">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <Skeleton className="h-4 w-2/5 max-w-[12rem]" />
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
              <Skeleton className="h-4 w-1/3 max-w-[10rem]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5 max-w-[14rem]" />
                <Skeleton className="h-4 w-2/5 max-w-[10rem]" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-16" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Initial load placeholders for the preview row (layout panel on lg+, document preview). */
export function CvPreviewLoadingRow() {
  return (
    <>
      <div className="hidden shrink-0 lg:block">
        <div className="sticky top-6">
          <CvLayoutPanelSkeleton />
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <CvPreviewDocumentSkeleton />
      </div>
    </>
  );
}

/** @deprecated Use CvPreviewDocumentSkeleton or CvPreviewLoadingRow */
export function CvPreviewSkeleton() {
  return <CvPreviewDocumentSkeleton />;
}
