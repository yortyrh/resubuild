import { Skeleton } from '@/components/ui/skeleton';

const cvListItemActionsClassName = 'divider-soft mt-auto flex justify-end border-t pt-3';

function CvListItemSkeleton() {
  return (
    <article className="surface-soft text-card-foreground flex gap-4 p-4">
      <Skeleton className="w-30 h-[155px] shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-md" />
        </div>
        <div className={cvListItemActionsClassName}>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </article>
  );
}

export function CvListSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading CVs">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 shrink-0" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <CvListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
