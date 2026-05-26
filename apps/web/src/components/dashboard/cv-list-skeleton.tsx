import { Skeleton } from '@/components/ui/skeleton';

const cvListItemActionsClassName = 'divider-soft mt-4 flex gap-2 border-t pt-4';

function CvListItemSkeleton() {
  return (
    <article className="surface-soft text-card-foreground p-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
      </div>
      <div className={cvListItemActionsClassName}>
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-20" />
      </div>
    </article>
  );
}

export function CvListSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2"
      role="status"
      aria-busy="true"
      aria-label="Loading CVs"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <CvListItemSkeleton key={index} />
      ))}
    </div>
  );
}
