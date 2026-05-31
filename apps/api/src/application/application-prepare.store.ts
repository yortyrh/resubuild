import { randomUUID } from 'node:crypto';
import type { PrepareApplicationProgress } from '@resumind/import-agent';
import type { JobSourceType } from '@resumind/types';

/** In-memory intake so a stuck prepare can be retried without re-uploading. */
export interface PrepareIntakeSnapshot {
  sourceType: JobSourceType;
  url?: string;
  text?: string;
  message?: string;
  sourceCvId?: string;
  pdfBuffer?: Buffer;
  imageBuffer?: Buffer;
  imageMimeType?: string;
}

export interface ApplicationPrepareRecord {
  id: string;
  userId: string;
  progress?: PrepareApplicationProgress;
  errors?: string[];
  cancelled?: boolean;
  intake?: PrepareIntakeSnapshot;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export class ApplicationPrepareStore {
  private readonly jobs = new Map<string, ApplicationPrepareRecord>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  init(
    applicationId: string,
    userId: string,
    options?: { intake?: PrepareIntakeSnapshot },
  ): ApplicationPrepareRecord {
    this.pruneExpired();
    const now = Date.now();
    const record: ApplicationPrepareRecord = {
      id: applicationId,
      userId,
      intake: options?.intake,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(applicationId, record);
    return record;
  }

  get(applicationId: string, userId: string): ApplicationPrepareRecord | null {
    this.pruneExpired();
    const record = this.jobs.get(applicationId);
    if (!record || record.userId !== userId) return null;
    return record;
  }

  update(
    applicationId: string,
    patch: Partial<ApplicationPrepareRecord>,
  ): ApplicationPrepareRecord | null {
    const record = this.jobs.get(applicationId);
    if (!record) return null;
    const next = { ...record, ...patch, updatedAt: Date.now() };
    this.jobs.set(applicationId, next);
    return next;
  }

  isCancelled(applicationId: string): boolean {
    return this.jobs.get(applicationId)?.cancelled === true;
  }

  markCancelled(applicationId: string): ApplicationPrepareRecord | null {
    return this.update(applicationId, { cancelled: true, errors: ['Cancelled by user'] });
  }

  clearCancelled(applicationId: string): ApplicationPrepareRecord | null {
    return this.update(applicationId, { cancelled: false, errors: [] });
  }

  delete(applicationId: string): void {
    this.jobs.delete(applicationId);
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, record] of this.jobs.entries()) {
      if (record.updatedAt < cutoff) {
        this.jobs.delete(id);
      }
    }
  }
}

/** Exported for tests that need deterministic ids. */
export function createApplicationId(): string {
  return randomUUID();
}
