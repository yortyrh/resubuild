import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Resume } from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { DbScope } from '../database/db-scope';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvNormalizedRepository } from './cv-normalized.repository';

export interface CloneCvResult {
  id: string;
  sourceCvId: string;
}

@Injectable()
export class CvCloneService {
  constructor(
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly resumeValidator: ResumeSchemaValidator,
  ) {}

  async deepClone(
    user: AuthenticatedRequest['user'],
    sourceCvId: string,
    options: {
      kind?: 'application_clone' | 'primary';
    } = {},
  ): Promise<CloneCvResult> {
    const scope = this.normalizedRepo.scopeFor(user);
    const sourceHeader = await this.normalizedRepo.fetchHeader(scope, sourceCvId);

    if (!sourceHeader) {
      throw new NotFoundException('Source CV not found');
    }

    const resume = await this.normalizedRepo.assembleFullResume(scope, sourceCvId);
    if (!resume) {
      throw new NotFoundException('Source CV not found');
    }

    const kind = options.kind ?? 'application_clone';

    const id = await this.normalizedRepo.inTransaction(scope, async (tx) => {
      const inserted = await this.normalizedRepo.insertHeader(tx, {
        source_cv_id: sourceCvId,
        kind,
        location: (sourceHeader.location ?? {}) as Record<string, unknown>,
        template_id: sourceHeader.template_id ?? 'classic',
      });

      await this.normalizedRepo.insertNormalizedCv(tx, inserted.id, resume as Resume);
      await this.assertAssembles(tx, inserted.id);
      return inserted.id;
    });

    return { id, sourceCvId };
  }

  async cloneFromResume(
    user: AuthenticatedRequest['user'],
    resume: Resume,
    options: {
      kind?: 'application_clone' | 'primary';
      sourceCvId?: string | null;
      templateId?: string;
    } = {},
  ): Promise<CloneCvResult> {
    this.resumeValidator.validate(resume as unknown as Record<string, unknown>);

    const scope = this.normalizedRepo.scopeFor(user);
    const kind = options.kind ?? 'application_clone';

    const id = await this.normalizedRepo.inTransaction(scope, async (tx) => {
      const inserted = await this.normalizedRepo.insertHeader(tx, {
        source_cv_id: options.sourceCvId ?? null,
        kind,
        location: (resume.basics?.location ?? {}) as Record<string, unknown>,
        template_id: options.templateId ?? 'classic',
      });

      await this.normalizedRepo.insertNormalizedCv(tx, inserted.id, resume);
      await this.assertAssembles(tx, inserted.id);
      return inserted.id;
    });

    return { id, sourceCvId: options.sourceCvId ?? id };
  }

  /** Re-assembles the new CV and validates it; throwing rolls the clone back. */
  private async assertAssembles(scope: DbScope, cvId: string): Promise<void> {
    const assembled = await this.normalizedRepo.assembleFullResume(scope, cvId);
    if (!assembled) {
      throw new BadRequestException('Clone assembly failed');
    }

    this.resumeValidator.validate(assembled as unknown as Record<string, unknown>);
  }

  async promoteClone(
    user: AuthenticatedRequest['user'],
    cloneCvId: string,
  ): Promise<CloneCvResult> {
    const scope = this.normalizedRepo.scopeFor(user);
    const header = await this.normalizedRepo.fetchHeader(scope, cloneCvId);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    if (header.kind !== 'application_clone') {
      throw new BadRequestException('Only application clones can be promoted');
    }

    return this.deepClone(user, cloneCvId, { kind: 'primary' });
  }
}

@Injectable()
export class CvSourceLoaderService {
  constructor(private readonly normalizedRepo: CvNormalizedRepository) {}

  async loadWorkItems(user: AuthenticatedRequest['user'], sourceCvId: string) {
    const scope = this.normalizedRepo.scopeFor(user);
    return this.normalizedRepo.listSectionRows(scope, sourceCvId, 'work');
  }

  async loadVolunteerItems(user: AuthenticatedRequest['user'], sourceCvId: string) {
    const scope = this.normalizedRepo.scopeFor(user);
    return this.normalizedRepo.listSectionRows(scope, sourceCvId, 'volunteer');
  }

  async loadProjectItems(user: AuthenticatedRequest['user'], sourceCvId: string) {
    const scope = this.normalizedRepo.scopeFor(user);
    return this.normalizedRepo.listSectionRows(scope, sourceCvId, 'projects');
  }
}
