import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidTemplateId } from '@resumind/resume-template';
import type { Resume } from '@resumind/types';
import { type CvHeaderRow, deriveCvTitleFromBasics, headerToSlimCvData } from '@resumind/types';
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
      templateId: header.template_id ?? 'mit-classic',
      data: headerToSlimCvData(header),
      created_at: header.created_at ?? '',
      updated_at: header.updated_at ?? '',
    };
  }

  async findAll(user: AuthenticatedRequest['user']): Promise<CvRecord[]> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const { data, error } = await supabase
      .from('cv')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const rows = data ?? [];
    return rows.map((header) => this.toCvRecord(header as CvHeaderRow));
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<CvRecord> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, id);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return this.toCvRecord(header);
  }

  async getHeader(user: AuthenticatedRequest['user'], id: string): Promise<CvHeaderRow> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, id);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return header;
  }

  async create(user: AuthenticatedRequest['user'], dto: CreateCvDto): Promise<CvRecord> {
    this.resumeValidator.validate(dto.data as unknown as Record<string, unknown>);

    const supabase = this.normalizedRepo.createClientForUser(user);

    const { data: inserted, error: insertError } = await supabase
      .from('cv')
      .insert({
        user_id: user.id,
        location: {},
      })
      .select('*')
      .single();

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    const header = await this.normalizedRepo.insertNormalizedCv(
      supabase,
      inserted.id,
      user.id,
      dto.data as unknown as Resume,
    );

    return this.toCvRecord(header);
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    dto: UpdateCvDto,
  ): Promise<CvRecord> {
    const supabase = this.normalizedRepo.createClientForUser(user);

    if (dto.templateId !== undefined) {
      if (!isValidTemplateId(dto.templateId)) {
        throw new BadRequestException(`Unknown template id: ${dto.templateId}`);
      }
      const { error } = await supabase
        .from('cv')
        .update({ template_id: dto.templateId })
        .eq('id', id);
      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    if (dto.data !== undefined) {
      this.resumeValidator.validate(dto.data as unknown as Record<string, unknown>);
      await this.normalizedRepo.replaceNormalizedCv(supabase, id, dto.data as unknown as Resume);
    }

    const header = await this.normalizedRepo.fetchHeader(supabase, id);
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
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.replaceNormalizedCv(
      supabase,
      id,
      data as unknown as Resume,
    );

    return this.toCvRecord(header);
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<void> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const { data, error } = await supabase
      .from('cv')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('CV not found');
    }
  }
}
