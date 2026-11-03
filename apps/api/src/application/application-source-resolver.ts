import type { CvSummaryForRanking } from '@resubuild/import-agent';
import type { JobApplicationRow, Resume } from '@resubuild/types';
import { assembleResume, deriveCvTitleFromBasics } from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';

export const APPLICATION_SNAPSHOT_CV_ID = '__application_snapshot__';

export interface ResolvedApplicationSource {
  workflowCvId: string;
  liveSourceCvId: string | null;
  resume: Resume;
  cvSummary: CvSummaryForRanking;
  fromSnapshot: boolean;
}

export function resumeToCvSummary(resume: Resume, id: string): CvSummaryForRanking {
  return {
    id,
    title: deriveCvTitleFromBasics(resume.basics),
    name: resume.basics?.name?.trim() || undefined,
    label: resume.basics?.label,
    summary: resume.basics?.summary,
    workHighlights: (resume.work ?? []).flatMap((work) => work.highlights ?? []).slice(0, 12),
    skills: (resume.skills ?? [])
      .map((skill) => skill.name ?? '')
      .filter(Boolean)
      .slice(0, 20),
  };
}

export function parseSourceCvSnapshot(snapshot: unknown): Resume | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const resume = snapshot as Resume;
  if (!resume.basics || typeof resume.basics !== 'object') {
    return null;
  }

  return resume;
}

export function deriveSourceCvTitle(
  row: Pick<JobApplicationRow, 'source_cv_snapshot'>,
): string | null {
  const resume = parseSourceCvSnapshot(row.source_cv_snapshot);
  if (!resume) {
    return null;
  }

  return deriveCvTitleFromBasics(resume.basics);
}

export async function resolveApplicationSource(
  user: AuthenticatedRequest['user'],
  row: JobApplicationRow,
  normalizedRepo: CvNormalizedRepository,
): Promise<ResolvedApplicationSource | null> {
  const scope = normalizedRepo.scopeFor(user);
  const candidateIds = [row.source_cv_id, row.intake_source_cv_id].filter((id): id is string =>
    Boolean(id),
  );

  for (const cvId of candidateIds) {
    const header = await normalizedRepo.fetchHeader(scope, cvId);
    if (!header || header.kind !== 'primary') {
      continue;
    }

    const resume = await normalizedRepo.assembleFullResume(scope, cvId);
    if (!resume) {
      continue;
    }

    return {
      workflowCvId: cvId,
      liveSourceCvId: cvId,
      resume,
      cvSummary: resumeToCvSummary(resume, cvId),
      fromSnapshot: false,
    };
  }

  const snapshotResume = parseSourceCvSnapshot(row.source_cv_snapshot);
  if (!snapshotResume) {
    return null;
  }

  const workflowCvId = row.source_cv_id ?? row.intake_source_cv_id ?? APPLICATION_SNAPSHOT_CV_ID;

  return {
    workflowCvId,
    liveSourceCvId: null,
    resume: snapshotResume,
    cvSummary: resumeToCvSummary(snapshotResume, workflowCvId),
    fromSnapshot: true,
  };
}

export async function buildSourceCvSnapshot(
  user: AuthenticatedRequest['user'],
  sourceCvId: string,
  normalizedRepo: CvNormalizedRepository,
): Promise<Resume | null> {
  const scope = normalizedRepo.scopeFor(user);
  return normalizedRepo.assembleFullResume(scope, sourceCvId);
}

export async function buildCvSummaryFromId(
  user: AuthenticatedRequest['user'],
  cvId: string,
  normalizedRepo: CvNormalizedRepository,
): Promise<CvSummaryForRanking | null> {
  const scope = normalizedRepo.scopeFor(user);
  const header = await normalizedRepo.fetchHeader(scope, cvId);
  if (!header) {
    return null;
  }

  const sections = await normalizedRepo.fetchSections(scope, cvId);
  const resume = assembleResume(header, sections);
  return resumeToCvSummary(resume, cvId);
}
