import type { JobSourceType } from '@resubuild/types';

export type PrepareApplicationProgress =
  | 'normalizing'
  | 'summarizing'
  | 'selecting_cv'
  | 'tailoring'
  | 'drafting_letter'
  | 'finalizing';

export interface CvSummaryForRanking {
  id: string;
  title: string;
  /** Candidate full name from CV basics.name */
  name?: string;
  label?: string;
  summary?: string;
  workHighlights: string[];
  skills: string[];
}

export interface JobSummary {
  title: string;
  company: string;
  requirements: string[];
  keywords: string[];
  language?: string;
}

export interface TailorCvPatch {
  basics?: { label?: string };
  work?: Array<{ index: number; summary?: string; highlights?: string[] }>;
  volunteer?: Array<{ index: number; summary?: string; highlights?: string[] }>;
  projects?: Array<{ index: number; summary?: string; highlights?: string[] }>;
}

export interface PrepareApplicationWorkflowInput {
  sourceType: JobSourceType;
  url?: string;
  text?: string;
  pdfBuffer?: Buffer;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  userMessage?: string;
  sourceCvId?: string;
  cvSummaries: CvSummaryForRanking[];
  /** Fallback when selected CV has no basics.name (e.g. auth user_metadata.full_name). */
  accountDisplayName?: string;
  modelId: string;
  apiKey: string;
  onProgress?: (progress: PrepareApplicationProgress) => void;
  /** Test hook — skip Agent calls. */
  generateJson?: (prompt: string) => Promise<Record<string, unknown>>;
  generateText?: (prompt: string) => Promise<string>;
  transcribeImage?: (buffer: Buffer, mimeType: string) => Promise<string>;
  fetchJobUrl?: (url: string) => Promise<string>;
}

export interface PrepareApplicationWorkflowResult {
  sourceCvId?: string;
  jobSummary: JobSummary;
  jobRawText: string;
  tailorPatch: TailorCvPatch;
  coverLetter: string;
  coverLetterEmailSubject: string;
  selectionRationale: string;
  errors: string[];
}

export interface UpdateApplicationWorkflowInput {
  jobSummary: JobSummary;
  jobRawText: string;
  userMessage?: string;
  /** Explicit base CV from user; omit for AI re-rank. */
  sourceCvId?: string;
  currentResume: Record<string, unknown>;
  currentCoverLetter: string;
  cvSummaries: CvSummaryForRanking[];
  accountDisplayName?: string;
  modelId: string;
  apiKey: string;
  onProgress?: (progress: PrepareApplicationProgress) => void;
  generateJson?: (prompt: string) => Promise<Record<string, unknown>>;
  generateText?: (prompt: string) => Promise<string>;
}

export interface UpdateApplicationWorkflowResult {
  sourceCvId?: string;
  tailorPatch: TailorCvPatch;
  coverLetter: string;
  coverLetterEmailSubject: string;
  selectionRationale: string;
  errors: string[];
}
