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
    <TableRow className="border-[#E3E3E3] hover:bg-transparent">
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

export function ApplicationListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading applications</span>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="surface-soft text-card-foreground overflow-hidden">
        <Table aria-label="Applications">
          <TableHeader>
            <TableRow className="border-[#E3E3E3] hover:bg-transparent">
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
    </div>
  );
}
