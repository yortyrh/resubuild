import { randomUUID } from 'node:crypto';
import type { ImportJobProgress, ImportJobStatus } from '@resumind/import-agent';

export interface ImportJobRecord {
  id: string;
  userId: string;
  status: ImportJobStatus;
  progress?: ImportJobProgress;
  cvId?: string;
  /** Normalized JSON Resume draft for client preview (website import, no CV created yet). */
  previewData?: Record<string, unknown>;
  /** Count of social profiles auto-discovered during agent import. */
  discoveredProfilesCount?: number;
  errors?: string[];
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export class ImportJobStore {
  private readonly jobs = new Map<string, ImportJobRecord>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  create(userId: string): ImportJobRecord {
    this.pruneExpired();
    const now = Date.now();
    const job: ImportJobRecord = {
      id: randomUUID(),
      userId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  get(jobId: string, userId: string): ImportJobRecord | null {
    this.pruneExpired();
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId) {
      return null;
    }
    return job;
  }

  update(jobId: string, patch: Partial<ImportJobRecord>): ImportJobRecord | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    const next = { ...job, ...patch, updatedAt: Date.now() };
    this.jobs.set(jobId, next);
    return next;
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, job] of this.jobs.entries()) {
      if (job.updatedAt < cutoff) {
        this.jobs.delete(id);
      }
    }
  }
}
