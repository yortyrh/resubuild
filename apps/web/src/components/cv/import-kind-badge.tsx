import { cn } from '@/lib/utils';

export interface ImportKindBadgeProps {
  label: string;
  className?: string;
  testId?: string;
}

export function ImportKindBadge({ label, className, testId }: ImportKindBadgeProps) {
  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      data-testid={testId}
    >
      {label}
    </span>
  );
}
