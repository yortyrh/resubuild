import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Resume } from '@resubuild/types';
import { prepareImportedResume } from '@resubuild/types';
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
    const scope = this.normalizedRepo.scopeFor(user);

    const target = await this.normalizedRepo.fetchHeader(scope, cvId);
    if (!target) {
      throw new NotFoundException('CV not found');
    }
    if (target.kind !== 'primary') {
      throw new BadRequestException('Only primary CVs can be replaced');
    }

    // One transaction: build the replacement as a staging CV, drop the old
    // primary, then promote the staging row. Any failure rolls everything back.
    const promotedId = await this.normalizedRepo.inTransaction(scope, async (tx) => {
      const staging = await this.normalizedRepo.insertHeader(tx, {
        kind: 'import_staging',
        location: {},
      });

      await this.normalizedRepo.insertNormalizedCv(tx, staging.id, prepared as Resume);

      const deleted = await this.normalizedRepo.deleteHeader(tx, cvId, 'primary');
      if (!deleted) {
        throw new NotFoundException('CV not found');
      }

      const promoted = await this.normalizedRepo.updateHeaderFields(tx, staging.id, {
        kind: 'primary',
      });
      if (!promoted) {
        throw new BadRequestException('Failed to promote the imported CV');
      }

      return staging.id;
    });

    return this.cvService.findOne(user, promotedId);
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
