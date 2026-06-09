import { Skeleton } from '@/components/ui/skeleton';

function ApplicationListItemSkeleton() {
  return (
    <li className="surface-soft text-card-foreground flex items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-9 w-16" />
    </li>
  );
}

export function ApplicationListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading applications</span>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-44" />
      </div>

      <ul className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <ApplicationListItemSkeleton key={index} />
        ))}
      </ul>
    </div>
  );
}
