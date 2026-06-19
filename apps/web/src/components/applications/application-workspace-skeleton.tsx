import { Skeleton } from '@/components/ui/skeleton';

export function ApplicationWorkspaceSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading application"
    >
      <span className="sr-only">Loading application</span>

      <div className="space-y-2 px-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-36 max-w-full" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="h-7 w-64 max-w-full" />
      </div>

      <div className="surface-soft text-card-foreground space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        <div className="space-y-3">
          <div>
            <Skeleton className="mb-1.5 h-3 w-16" />
            <Skeleton className="h-4 w-3/5 max-w-full" />
          </div>
          <div>
            <Skeleton className="mb-1.5 h-3 w-16" />
            <Skeleton className="h-4 w-2/5 max-w-full" />
          </div>
          <div>
            <Skeleton className="mb-1.5 h-3 w-20" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="mt-1.5 h-4 w-11/12 max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
