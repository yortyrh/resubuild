const PREPARE_PROGRESS_STEPS = [
  'queued',
  'normalizing',
  'summarizing',
  'selecting_cv',
  'tailoring',
  'drafting_letter',
  'finalizing',
] as const;

const UPDATE_PROGRESS_STEPS = [
  'queued',
  'selecting_cv',
  'tailoring',
  'drafting_letter',
  'finalizing',
] as const;

const PROGRESS_LABELS: Record<string, string> = {
  queued: 'Queued…',
  normalizing: 'Reading job posting…',
  summarizing: 'Analyzing job posting…',
  selecting_cv: 'Selecting best CV…',
  tailoring: 'Tailoring CV…',
  drafting_letter: 'Writing cover letter…',
  finalizing: 'Finalizing…',
  running: 'Processing…',
};

function stepsForProgress(progress: string | null | undefined, isUpdate: boolean) {
  const steps = isUpdate ? UPDATE_PROGRESS_STEPS : PREPARE_PROGRESS_STEPS;
  const index = progress ? (steps as readonly string[]).indexOf(progress) : steps.indexOf('queued');
  return { steps, index: index >= 0 ? index : 0 };
}

export function applicationProgressPercent(
  progress: string | null | undefined,
  options?: { isUpdate?: boolean; status?: string },
): number {
  if (options?.status === 'running' && !progress) {
    return 15;
  }

  const { steps, index } = stepsForProgress(progress, options?.isUpdate ?? false);
  return Math.round(((index + 1) / steps.length) * 100);
}

export function applicationProgressLabel(
  progress: string | null | undefined,
  status?: string,
): string {
  if (progress) {
    return PROGRESS_LABELS[progress] ?? `Processing: ${progress.replaceAll('_', ' ')}`;
  }

  if (status === 'queued') {
    return PROGRESS_LABELS.queued;
  }

  if (status === 'running') {
    return 'Preparing application…';
  }

  return 'Starting…';
}
