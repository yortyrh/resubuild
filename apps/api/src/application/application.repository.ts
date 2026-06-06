import { BadRequestException, Injectable } from '@nestjs/common';
import type { JobApplicationRow, JobApplicationStatus, JobSourceType } from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';

export interface CreateJobApplicationInput {
  status: JobApplicationStatus;
  job_source_type: JobSourceType;
  user_message?: string | null;
  intake_source_cv_id?: string | null;
  source_application_id?: string | null;
  is_list_visible?: boolean;
  job_title?: string | null;
  job_company?: string | null;
  job_raw_text?: string | null;
  source_cv_id?: string | null;
  source_cv_snapshot?: Record<string, unknown> | null;
  cover_letter?: string | null;
  cover_letter_email_subject?: string | null;
  selection_rationale?: string | null;
}

export type UpdateJobApplicationInput = Partial<
  Pick<
    JobApplicationRow,
    | 'status'
    | 'job_title'
    | 'job_company'
    | 'job_raw_text'
    | 'source_cv_id'
    | 'tailored_cv_id'
    | 'cover_letter'
    | 'cover_letter_email_subject'
    | 'selection_rationale'
    | 'user_message'
    | 'intake_source_cv_id'
    | 'source_cv_snapshot'
    | 'source_application_id'
    | 'is_list_visible'
  >
>;

@Injectable()
export class ApplicationRepository {
  constructor(private readonly normalizedRepo: CvNormalizedRepository) {}

  private createClient(user: AuthenticatedRequest['user']) {
    return this.normalizedRepo.createClientForUser(user);
  }

  async create(
    user: AuthenticatedRequest['user'],
    input: CreateJobApplicationInput,
  ): Promise<JobApplicationRow> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .insert({
        user_id: user.id,
        status: input.status,
        job_source_type: input.job_source_type,
        user_message: input.user_message ?? null,
        intake_source_cv_id: input.intake_source_cv_id ?? null,
        source_application_id: input.source_application_id ?? null,
        is_list_visible: input.is_list_visible ?? true,
        job_title: input.job_title ?? null,
        job_company: input.job_company ?? null,
        job_raw_text: input.job_raw_text ?? null,
        source_cv_id: input.source_cv_id ?? null,
        source_cv_snapshot: input.source_cv_snapshot ?? null,
        cover_letter: input.cover_letter ?? null,
        cover_letter_email_subject: input.cover_letter_email_subject ?? null,
        selection_rationale: input.selection_rationale ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as JobApplicationRow;
  }

  async findAll(user: AuthenticatedRequest['user']): Promise<JobApplicationRow[]> {
    const supabase = this.createClient(user);
    let query = supabase.from('job_application').select('*').eq('is_list_visible', true);

    // When using service-role client (MCP auth path), no RLS token scopes the query,
    // so we must filter explicitly by user_id to avoid returning all users' applications.
    if (user.authMethod === 'mcp') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as JobApplicationRow[];
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<JobApplicationRow | null> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data as JobApplicationRow | null) ?? null;
  }

  async findActiveUpdateDraft(
    user: AuthenticatedRequest['user'],
    sourceApplicationId: string,
  ): Promise<JobApplicationRow | null> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .select('*')
      .eq('source_application_id', sourceApplicationId)
      .eq('is_list_visible', false)
      .in('status', ['queued', 'running'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data as JobApplicationRow | null) ?? null;
  }

  async findDanglingUpdateDrafts(
    user: AuthenticatedRequest['user'],
    sourceApplicationId: string,
  ): Promise<JobApplicationRow[]> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .select('*')
      .eq('source_application_id', sourceApplicationId)
      .eq('is_list_visible', false);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []) as JobApplicationRow[];
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    patch: UpdateJobApplicationInput,
  ): Promise<JobApplicationRow | null> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data as JobApplicationRow | null) ?? null;
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<boolean> {
    const supabase = this.createClient(user);
    const { data, error } = await supabase
      .from('job_application')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data != null;
  }
}
