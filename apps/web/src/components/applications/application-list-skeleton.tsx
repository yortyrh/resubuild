import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function ApplicationRowSkeleton() {
  return (
    <TableRow className="divider-soft hover:bg-transparent">
      <TableCell className="py-3">
        <Skeleton className="h-5 w-3/5" />
      </TableCell>
      <TableCell className="py-3">
        <Skeleton className="h-4 w-4/5" />
      </TableCell>
      <TableCell className="py-3">
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ApplicationCardSkeleton() {
  return (
    <div className="surface-soft text-card-foreground p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-md" />
      </div>
      <div className="divider-soft mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
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

      <div className="surface-soft text-card-foreground hidden overflow-hidden md:block">
        <Table aria-label="Applications">
          <TableHeader>
            <TableRow className="divider-soft hover:bg-transparent">
              <TableHead className="text-muted-foreground bg-muted/30 h-10 text-xs font-medium uppercase tracking-wide">
                Company
              </TableHead>
              <TableHead className="text-muted-foreground bg-muted/30 h-10 text-xs font-medium uppercase tracking-wide">
                Position
              </TableHead>
              <TableHead className="text-muted-foreground bg-muted/30 h-10 text-xs font-medium uppercase tracking-wide">
                Application status
              </TableHead>
              <TableHead className="text-muted-foreground bg-muted/30 h-10 text-right text-xs font-medium uppercase tracking-wide">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }, (_, index) => (
              <ApplicationRowSkeleton key={index} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <ApplicationCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
