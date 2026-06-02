import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Resume } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
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
    const supabase = this.normalizedRepo.createClientForUser(user);
    const sourceHeader = await this.normalizedRepo.fetchHeader(supabase, sourceCvId);

    if (!sourceHeader) {
      throw new NotFoundException('Source CV not found');
    }

    const resume = await this.normalizedRepo.assembleFullResume(supabase, sourceCvId);
    if (!resume) {
      throw new NotFoundException('Source CV not found');
    }

    const kind = options.kind ?? 'application_clone';

    const { data: inserted, error: insertError } = await supabase
      .from('cv')
      .insert({
        user_id: user.id,
        source_cv_id: sourceCvId,
        kind,
        location: sourceHeader.location ?? {},
        template_id: sourceHeader.template_id ?? 'classic',
      })
      .select('id')
      .single();

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    await this.normalizedRepo.insertNormalizedCv(supabase, inserted.id, user.id, resume as Resume);

    const assembled = await this.normalizedRepo.assembleFullResume(supabase, inserted.id);
    if (!assembled) {
      throw new BadRequestException('Clone assembly failed');
    }

    this.resumeValidator.validate(assembled as unknown as Record<string, unknown>);

    return { id: inserted.id, sourceCvId };
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

    const supabase = this.normalizedRepo.createClientForUser(user);
    const kind = options.kind ?? 'application_clone';

    const { data: inserted, error: insertError } = await supabase
      .from('cv')
      .insert({
        user_id: user.id,
        source_cv_id: options.sourceCvId ?? null,
        kind,
        location: resume.basics?.location ?? {},
        template_id: options.templateId ?? 'classic',
      })
      .select('id')
      .single();

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    await this.normalizedRepo.insertNormalizedCv(supabase, inserted.id, user.id, resume);

    const assembled = await this.normalizedRepo.assembleFullResume(supabase, inserted.id);
    if (!assembled) {
      throw new BadRequestException('Clone assembly failed');
    }

    this.resumeValidator.validate(assembled as unknown as Record<string, unknown>);

    return { id: inserted.id, sourceCvId: options.sourceCvId ?? inserted.id };
  }

  async promoteClone(
    user: AuthenticatedRequest['user'],
    cloneCvId: string,
  ): Promise<CloneCvResult> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, cloneCvId);

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
    const supabase = this.normalizedRepo.createClientForUser(user);
    return this.normalizedRepo.listSectionRows(supabase, sourceCvId, 'work');
  }

  async loadVolunteerItems(user: AuthenticatedRequest['user'], sourceCvId: string) {
    const supabase = this.normalizedRepo.createClientForUser(user);
    return this.normalizedRepo.listSectionRows(supabase, sourceCvId, 'volunteer');
  }

  async loadProjectItems(user: AuthenticatedRequest['user'], sourceCvId: string) {
    const supabase = this.normalizedRepo.createClientForUser(user);
    return this.normalizedRepo.listSectionRows(supabase, sourceCvId, 'projects');
  }
}
