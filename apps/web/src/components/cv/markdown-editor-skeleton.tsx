import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MarkdownEditorSkeletonProps {
  variant?: 'inline' | 'block';
  className?: string;
}

export function MarkdownEditorSkeleton({
  variant = 'block',
  className,
}: MarkdownEditorSkeletonProps) {
  return (
    <div
      className={cn(
        'border-input bg-background rounded-md border p-3',
        variant === 'inline' ? 'space-y-2' : 'space-y-3',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="flex gap-2">
        {Array.from({ length: variant === 'inline' ? 4 : 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-8 shrink-0" />
        ))}
      </div>
      <Skeleton className={cn('w-full', variant === 'inline' ? 'h-9' : 'h-48')} />
    </div>
  );
}
