import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  applyResumeMetaForCreate,
  applyResumeMetaForUpdate,
  getResumeMetaVersion,
} from '@resumind/types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
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
  ) {}

  private createUserClient(accessToken: string): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !anonKey) {
      throw new Error('Supabase is not configured');
    }

    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  async findAll(user: AuthenticatedRequest['user']): Promise<CvRecord[]> {
    const supabase = this.createUserClient(user.accessToken);
    const { data, error } = await supabase
      .from('cv')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<CvRecord> {
    const supabase = this.createUserClient(user.accessToken);
    const { data, error } = await supabase.from('cv').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('CV not found');
    }

    return data;
  }

  private appBaseUrl(): string {
    return (
      this.configService.get<string>('APP_URL') ??
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0] ??
      'http://localhost:3000'
    );
  }

  async create(user: AuthenticatedRequest['user'], dto: CreateCvDto): Promise<CvRecord> {
    const supabase = this.createUserClient(user.accessToken);
    const baseUrl = this.appBaseUrl();

    const { data: inserted, error: insertError } = await supabase
      .from('cv')
      .insert({
        user_id: user.id,
        title: dto.title ?? 'Untitled CV',
        data: {},
      })
      .select('*')
      .single();

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }

    const dataWithMeta = applyResumeMetaForCreate(dto.data, {
      cvId: inserted.id,
      baseUrl,
    });
    this.resumeValidator.validate(dataWithMeta);

    const { data, error } = await supabase
      .from('cv')
      .update({ data: dataWithMeta })
      .eq('id', inserted.id)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    dto: UpdateCvDto,
  ): Promise<CvRecord> {
    const existing = await this.findOne(user, id);
    const supabase = this.createUserClient(user.accessToken);
    const payload: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      payload.title = dto.title;
    }

    if (dto.data !== undefined) {
      const expectedVersion = getResumeMetaVersion(dto.data);
      const currentVersion = getResumeMetaVersion(existing.data);

      if (expectedVersion && currentVersion && expectedVersion !== currentVersion) {
        throw new ConflictException(
          'This CV was modified elsewhere. Reload the page and try again.',
        );
      }

      const dataWithMeta = applyResumeMetaForUpdate(dto.data, {
        cvId: id,
        baseUrl: this.appBaseUrl(),
        currentVersion: currentVersion ?? expectedVersion,
      });
      this.resumeValidator.validate(dataWithMeta);
      payload.data = dataWithMeta;
    }

    const { data, error } = await supabase
      .from('cv')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('CV not found');
    }

    return data;
  }

  async persistValidatedData(
    user: AuthenticatedRequest['user'],
    id: string,
    data: Record<string, unknown>,
  ): Promise<CvRecord> {
    this.resumeValidator.validate(data);
    const supabase = this.createUserClient(user.accessToken);
    const { data: row, error } = await supabase
      .from('cv')
      .update({ data })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!row) {
      throw new NotFoundException('CV not found');
    }

    return row;
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<void> {
    const supabase = this.createUserClient(user.accessToken);
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
