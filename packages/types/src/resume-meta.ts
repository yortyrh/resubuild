import type { Resume, ResumeMeta } from './resume';
import type { CvHeaderRow } from './resume-normalized';

export function formatResumeLastModified(date = new Date()): string {
  return date.toISOString().slice(0, 19);
}

export function getResumeMetaVersion(data: Record<string, unknown>): string | undefined {
  const meta = data.meta;
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  const version = (meta as ResumeMeta).version;
  return typeof version === 'string' && version.length > 0 ? version : undefined;
}

export function getCvMetaVersion(header: Pick<CvHeaderRow, 'meta_version'>): string | undefined {
  const version = header.meta_version;
  return typeof version === 'string' && version.length > 0 ? version : undefined;
}

export function metaFromCvHeader(header: CvHeaderRow): ResumeMeta | undefined {
  if (!header.meta_version && !header.meta_canonical && !header.meta_last_modified) {
    return undefined;
  }

  return {
    version: header.meta_version ?? undefined,
    canonical: header.meta_canonical ?? undefined,
    lastModified: header.meta_last_modified ?? undefined,
  };
}

export function bumpResumeMetaVersion(version: string): string {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
  if (match) {
    const patch = Number.parseInt(match[3], 10) + 1;
    return `v${match[1]}.${match[2]}.${patch}`;
  }

  const digits = version.replace(/\D/g, '');
  const current = Number.parseInt(digits || '0', 10);
  return `v${current + 1}.0.0`;
}

export function buildResumeCanonicalUrl(baseUrl: string, cvId: string): string {
  const normalized = baseUrl.replace(/\/$/, '');
  return `${normalized}/dashboard/cv/${cvId}`;
}

export function applyResumeMetaForCreate(
  data: Record<string, unknown>,
  options: { cvId: string; baseUrl: string; now?: Date },
): Record<string, unknown> {
  const now = options.now ?? new Date();

  return {
    ...data,
    meta: {
      canonical: buildResumeCanonicalUrl(options.baseUrl, options.cvId),
      version: 'v1.0.0',
      lastModified: formatResumeLastModified(now),
    },
  };
}

export function applyResumeMetaForUpdate(
  data: Record<string, unknown>,
  options: {
    cvId: string;
    baseUrl: string;
    currentVersion: string | undefined;
    now?: Date;
  },
): Record<string, unknown> {
  const now = options.now ?? new Date();
  const baseVersion = options.currentVersion ?? 'v1.0.0';

  return {
    ...data,
    meta: {
      canonical: buildResumeCanonicalUrl(options.baseUrl, options.cvId),
      version: bumpResumeMetaVersion(baseVersion),
      lastModified: formatResumeLastModified(now),
    },
  };
}

export function stripResumeMetaFromEditor(resume: Resume): Resume {
  const { meta, ...rest } = resume;
  void meta;
  return rest;
}
