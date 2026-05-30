const PROGRESS_STEPS = [
  'fetching',
  'uploading',
  'queued',
  'extracting',
  'drafting',
  'verifying',
  'repairing',
  'finalizing',
  'saving',
] as const;

const PROGRESS_LABELS: Record<string, string> = {
  fetching: 'Fetching URL…',
  uploading: 'Uploading file…',
  queued: 'Queued…',
  extracting: 'Extracting text…',
  drafting: 'Drafting résumé…',
  verifying: 'Verifying schema…',
  repairing: 'Repairing data…',
  finalizing: 'Finalizing…',
  saving: 'Saving CV…',
};

export function importProgressPercent(step: string | null | undefined): number {
  if (!step) {
    return 0;
  }

  const index = PROGRESS_STEPS.indexOf(step as (typeof PROGRESS_STEPS)[number]);
  if (index >= 0) {
    return Math.round(((index + 1) / PROGRESS_STEPS.length) * 100);
  }

  return 40;
}

export function importProgressLabel(step: string): string {
  return PROGRESS_LABELS[step] ?? `Processing: ${step}`;
}
