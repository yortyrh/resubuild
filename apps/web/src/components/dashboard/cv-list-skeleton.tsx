import { Skeleton } from '@/components/ui/skeleton';

function CvListItemSkeleton() {
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <Skeleton className="aspect-[8.5/11] w-full rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </article>
  );
}

export function CvListSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading CVs">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0 rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <CvListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
