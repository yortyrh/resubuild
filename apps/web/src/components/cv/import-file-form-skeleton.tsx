import { Skeleton } from '@/components/ui/skeleton';

export function ImportFileFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-hidden="true">
      <span className="sr-only">Loading import form</span>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="border-input flex h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-[4.75rem]" />
        <Skeleton className="h-10 w-[5.5rem]" />
        <Skeleton className="h-10 w-[4.5rem]" />
        <Skeleton className="h-10 w-[5rem]" />
      </div>
    </div>
  );
}
