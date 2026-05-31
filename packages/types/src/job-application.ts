import { sanitizeAiTypography } from './sanitize-ai-typography';

export type JobApplicationStatus = 'queued' | 'running' | 'ready' | 'failed';

export type JobSourceType = 'url' | 'text' | 'pdf' | 'image';

export interface JobApplicationRow {
  id: string;
  user_id: string;
  status: JobApplicationStatus;
  job_title?: string | null;
  job_company?: string | null;
  job_source_type?: JobSourceType | null;
  job_raw_text?: string | null;
  source_cv_id?: string | null;
  tailored_cv_id?: string | null;
  cover_letter?: string | null;
  cover_letter_email_subject?: string | null;
  selection_rationale?: string | null;
  user_message?: string | null;
  intake_source_cv_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** API-facing camelCase shape for web clients. */
export interface JobApplicationDetail {
  id: string;
  status: JobApplicationStatus;
  jobTitle?: string | null;
  jobCompany?: string | null;
  jobSourceType?: JobSourceType | null;
  jobRawText?: string | null;
  sourceCvId?: string | null;
  tailoredCvId?: string | null;
  coverLetter?: string | null;
  coverLetterEmailSubject?: string | null;
  selectionRationale?: string | null;
  userMessage?: string | null;
  intakeSourceCvId?: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: string;
  errors?: string[];
}

function sanitizeOptionalAiText(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return sanitizeAiTypography(trimmed);
}

export function jobApplicationRowToDetail(
  row: JobApplicationRow,
  extras?: { progress?: string; errors?: string[] },
): JobApplicationDetail {
  return {
    id: row.id,
    status: row.status,
    jobTitle: sanitizeOptionalAiText(row.job_title),
    jobCompany: sanitizeOptionalAiText(row.job_company),
    jobSourceType: row.job_source_type,
    jobRawText: row.job_raw_text,
    sourceCvId: row.source_cv_id,
    tailoredCvId: row.tailored_cv_id,
    coverLetter: sanitizeOptionalAiText(row.cover_letter),
    coverLetterEmailSubject: sanitizeOptionalAiText(row.cover_letter_email_subject),
    selectionRationale: sanitizeOptionalAiText(row.selection_rationale),
    userMessage: row.user_message,
    intakeSourceCvId: row.intake_source_cv_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progress: extras?.progress,
    errors: extras?.errors,
  };
}
