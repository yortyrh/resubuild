import {
  applicationProgressLabel,
  applicationProgressPercent,
} from '@/lib/application-prepare-progress';

export interface ApplicationPrepareProgressBarProps {
  progress?: string | null;
  status?: string;
  isUpdate?: boolean;
}

export function ApplicationPrepareProgressBar({
  progress,
  status,
  isUpdate = false,
}: ApplicationPrepareProgressBarProps) {
  const value = applicationProgressPercent(progress, { isUpdate, status });
  const label = applicationProgressLabel(progress, status);

  return (
    <div className="space-y-1.5" role="status" data-testid="application-prepare-progress-bar">
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
