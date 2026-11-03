import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidTemplateId, resolveCanonicalTemplateId } from '@resubuild/resume-template';
import type { Resume } from '@resubuild/types';
import { type CvHeaderRow, deriveCvTitleFromBasics, headerToSlimCvData } from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvNormalizedRepository } from './cv-normalized.repository';
import type { CreateCvDto, UpdateCvDto } from './dto/cv.dto';

export interface CvRecord {
  id: string;
  user_id: string;
  title: string;
  templateId: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class CvService {
  constructor(
    private readonly resumeValidator: ResumeSchemaValidator,
    private readonly normalizedRepo: CvNormalizedRepository,
  ) {}

  private deriveTitleFromHeader(header: CvHeaderRow): string {
    return deriveCvTitleFromBasics({
      name: header.name ?? undefined,
      label: header.label ?? undefined,
    });
  }

  private toCvRecord(header: CvHeaderRow): CvRecord {
    return {
      id: header.id,
      user_id: header.user_id,
      title: this.deriveTitleFromHeader(header),
      templateId: header.template_id ?? 'classic',
      data: headerToSlimCvData(header),
      created_at: header.created_at ?? '',
      updated_at: header.updated_at ?? '',
    };
  }

  async findAll(user: AuthenticatedRequest['user']): Promise<CvRecord[]> {
    const scope = this.normalizedRepo.scopeFor(user);
    const rows = await this.normalizedRepo.listHeaders(scope, 'primary');
    return rows.map((header) => this.toCvRecord(header));
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<CvRecord> {
    const scope = this.normalizedRepo.scopeFor(user);
    const header = await this.normalizedRepo.fetchHeader(scope, id);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return this.toCvRecord(header);
  }

  async getHeader(user: AuthenticatedRequest['user'], id: string): Promise<CvHeaderRow> {
    const scope = this.normalizedRepo.scopeFor(user);
    const header = await this.normalizedRepo.fetchHeader(scope, id);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return header;
  }

  async create(user: AuthenticatedRequest['user'], dto: CreateCvDto): Promise<CvRecord> {
    this.resumeValidator.validate(dto.data as unknown as Record<string, unknown>);

    const scope = this.normalizedRepo.scopeFor(user);
    const header = await this.normalizedRepo.inTransaction(scope, async (tx) => {
      const inserted = await this.normalizedRepo.insertHeader(tx, { location: {} });
      return this.normalizedRepo.insertNormalizedCv(tx, inserted.id, dto.data as unknown as Resume);
    });

    return this.toCvRecord(header);
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    dto: UpdateCvDto,
  ): Promise<CvRecord> {
    const scope = this.normalizedRepo.scopeFor(user);

    if (dto.templateId !== undefined) {
      if (!isValidTemplateId(dto.templateId)) {
        throw new BadRequestException(`Unknown template id: ${dto.templateId}`);
      }
      const canonicalTemplateId = resolveCanonicalTemplateId(dto.templateId);
      await this.normalizedRepo.updateHeaderFields(scope, id, {
        template_id: canonicalTemplateId,
      });
    }

    if (dto.data !== undefined) {
      this.resumeValidator.validate(dto.data as unknown as Record<string, unknown>);
      await this.normalizedRepo.replaceNormalizedCv(scope, id, dto.data as unknown as Resume);
    }

    const header = await this.normalizedRepo.fetchHeader(scope, id);
    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return this.toCvRecord(header);
  }

  async persistValidatedData(
    user: AuthenticatedRequest['user'],
    id: string,
    data: Record<string, unknown>,
  ): Promise<CvRecord> {
    this.resumeValidator.validate(data);
    const scope = this.normalizedRepo.scopeFor(user);
    const header = await this.normalizedRepo.replaceNormalizedCv(
      scope,
      id,
      data as unknown as Resume,
    );

    return this.toCvRecord(header);
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<void> {
    const scope = this.normalizedRepo.scopeFor(user);
    const deleted = await this.normalizedRepo.deleteHeader(scope, id);

    if (!deleted) {
      throw new NotFoundException('CV not found');
    }
  }
}
