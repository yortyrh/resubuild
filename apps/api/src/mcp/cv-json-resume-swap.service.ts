import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Resume } from '@resumind/types';
import { prepareImportedResume } from '@resumind/types';
import type { AuthUser } from '../auth/auth-user.types';
import { CvService } from '../cv/cv.service';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';

@Injectable()
export class CvJsonResumeSwapService {
  constructor(
    private readonly cvService: CvService,
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly schemaValidator: ResumeSchemaValidator,
  ) {}

  async createFromJsonResume(user: AuthUser, document: unknown) {
    const prepared = this.prepare(document);
    return this.cvService.create(user, { data: prepared as Record<string, unknown> });
  }

  async replaceFromJsonResume(user: AuthUser, cvId: string, document: unknown) {
    const prepared = this.prepare(document);
    const supabase = this.normalizedRepo.createClientForUser(user);

    const target = await this.normalizedRepo.fetchHeader(supabase, cvId, user.id);
    if (!target) {
      throw new NotFoundException('CV not found');
    }
    if (target.kind !== 'primary') {
      throw new BadRequestException('Only primary CVs can be replaced');
    }

    const { data: stagingInsert, error: stagingError } = await supabase
      .from('cv')
      .insert({
        user_id: user.id,
        kind: 'import_staging',
        location: {},
      })
      .select('*')
      .single();

    if (stagingError) {
      throw new BadRequestException(stagingError.message);
    }

    const stagingId = stagingInsert.id as string;

    try {
      await this.normalizedRepo.insertNormalizedCv(
        supabase,
        stagingId,
        user.id,
        prepared as Resume,
      );

      const { error: deleteError } = await supabase
        .from('cv')
        .delete()
        .eq('id', cvId)
        .eq('user_id', user.id)
        .eq('kind', 'primary');

      if (deleteError) {
        throw new BadRequestException(deleteError.message);
      }

      const { data: promoted, error: promoteError } = await supabase
        .from('cv')
        .update({ kind: 'primary' })
        .eq('id', stagingId)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (promoteError) {
        throw new BadRequestException(promoteError.message);
      }

      return this.cvService.findOne(user, promoted.id as string);
    } catch (error) {
      await supabase.from('cv').delete().eq('id', stagingId);
      throw error;
    }
  }

  private prepare(document: unknown): Record<string, unknown> {
    let prepared: Record<string, unknown>;
    try {
      prepared = prepareImportedResume(document);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON Resume document';
      throw new BadRequestException(message);
    }
    this.schemaValidator.validate(prepared);
    return prepared;
  }
}
