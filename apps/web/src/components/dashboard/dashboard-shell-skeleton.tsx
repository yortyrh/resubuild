import { Skeleton } from '@/components/ui/skeleton';

export function DashboardShellSkeleton() {
  return (
    <div
      className="min-h-screen md:grid md:grid-cols-[auto_1fr]"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <aside
        className="surface-soft text-card-foreground chrome-divider sticky top-0 hidden h-full shrink-0 overflow-y-auto border-r md:block"
        style={{ width: '16rem' }}
        aria-hidden="true"
      >
        <div className="flex h-full flex-col gap-3 px-3 py-4">
          <Skeleton className="mx-1 h-[42px] w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="chrome-divider bg-background sticky top-0 z-30 flex h-14 items-center gap-1 border-b px-2">
          <Skeleton className="size-9" />
          <Skeleton className="ml-1 h-4 w-48" />
        </header>

        <main className="bg-muted/30 flex-1 px-4 py-4">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-5 w-72 max-w-full" />
              </div>
              <Skeleton className="h-10 w-24 shrink-0" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton key={index} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
