import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Resume } from '@resumind/types';
import {
  applyResumeMetaForCreate,
  applyResumeMetaForUpdate,
  assembleResume,
  type CvHeaderRow,
  deriveCvTitleFromBasics,
  getCvMetaVersion,
} from '@resumind/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvNormalizedRepository } from './cv-normalized.repository';
import type { CreateCvDto, UpdateCvDto } from './dto/cv.dto';

export interface CvRecord {
  id: string;
  user_id: string;
  title: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class CvService {
  constructor(
    private readonly configService: ConfigService,
    private readonly resumeValidator: ResumeSchemaValidator,
    private readonly normalizedRepo: CvNormalizedRepository,
  ) {}

  private appBaseUrl(): string {
    return (
      this.configService.get<string>('APP_URL') ??
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0] ??
      'http://localhost:3000'
    );
  }

  private deriveTitleFromHeader(header: CvHeaderRow): string {
    return deriveCvTitleFromBasics({
      name: header.name ?? undefined,
      label: header.label ?? undefined,
    });
  }

  private async toCvRecord(supabase: SupabaseClient, header: CvHeaderRow): Promise<CvRecord> {
    const sections = await this.normalizedRepo.fetchSections(supabase, header.id);
    const resume = assembleResume(header, sections);

    return {
      id: header.id,
      user_id: header.user_id,
      title: this.deriveTitleFromHeader(header),
      data: resume as unknown as Record<string, unknown>,
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
    return Promise.all(rows.map((header) => this.toCvRecord(supabase, header as CvHeaderRow)));
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<CvRecord> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, id);

    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return this.toCvRecord(supabase, header);
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
    const supabase = this.normalizedRepo.createClientForUser(user);
    const baseUrl = this.appBaseUrl();

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

    const dataWithMeta = applyResumeMetaForCreate(dto.data, {
      cvId: inserted.id,
      baseUrl,
    }) as Resume;

    this.resumeValidator.validate(dataWithMeta as unknown as Record<string, unknown>);

    const header = await this.normalizedRepo.insertNormalizedCv(
      supabase,
      inserted.id,
      user.id,
      dataWithMeta,
    );

    return this.toCvRecord(supabase, header);
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    dto: UpdateCvDto,
  ): Promise<CvRecord> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const existing = await this.getHeader(user, id);
    const currentVersion = getCvMetaVersion(existing);

    if (dto.data !== undefined) {
      const expectedVersion = getCvMetaVersion({
        meta_version:
          dto.data.meta && typeof dto.data.meta === 'object'
            ? (dto.data.meta as { version?: string }).version
            : undefined,
      });

      if (expectedVersion && currentVersion && expectedVersion !== currentVersion) {
        throw new ConflictException(
          'This CV was modified elsewhere. Reload the page and try again.',
        );
      }

      const dataWithMeta = applyResumeMetaForUpdate(dto.data, {
        cvId: id,
        baseUrl: this.appBaseUrl(),
        currentVersion: currentVersion ?? expectedVersion,
      }) as Resume;

      this.resumeValidator.validate(dataWithMeta as unknown as Record<string, unknown>);
      await this.normalizedRepo.replaceNormalizedCv(supabase, id, dataWithMeta);
    }

    if (dto.title !== undefined) {
      // title is computed; ignore persisted title updates
    }

    const header = await this.normalizedRepo.fetchHeader(supabase, id);
    if (!header) {
      throw new NotFoundException('CV not found');
    }

    return this.toCvRecord(supabase, header);
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

    return this.toCvRecord(supabase, header);
  }

  async bumpVersion(
    supabase: SupabaseClient,
    cvId: string,
    currentVersion: string | undefined,
    clientVersion: string | undefined,
  ): Promise<string> {
    const baseUrl = this.appBaseUrl();
    const dataWithMeta = applyResumeMetaForUpdate(
      {},
      {
        cvId,
        baseUrl,
        currentVersion: currentVersion ?? clientVersion,
      },
    );

    const meta = dataWithMeta.meta as { version: string; canonical: string; lastModified: string };

    return this.normalizedRepo.bumpMetaVersion(supabase, cvId, meta);
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
