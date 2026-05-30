import { importProgressLabel, importProgressPercent } from '@/lib/import-job-progress';

export interface ImportProgressBarProps {
  progress: string | null | undefined;
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  if (!progress) {
    return null;
  }

  const value = importProgressPercent(progress);
  const label = importProgressLabel(progress);

  return (
    <div className="space-y-1.5" role="status" data-testid="import-progress-bar">
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
