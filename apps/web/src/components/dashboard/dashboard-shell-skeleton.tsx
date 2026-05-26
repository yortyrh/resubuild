import { Skeleton } from '@/components/ui/skeleton';

export function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen" role="status" aria-busy="true" aria-label="Loading dashboard">
      <header className="chrome-divider bg-background/90 supports-[backdrop-filter]:bg-background/75 border-b shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
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
      </main>
    </div>
  );
}
