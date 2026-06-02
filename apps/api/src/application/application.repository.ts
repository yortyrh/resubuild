import { BadRequestException, Injectable } from '@nestjs/common';
import type { JobApplicationRow, JobApplicationStatus, JobSourceType } from '@resumind/types';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';

export interface CreateJobApplicationInput {
  status: JobApplicationStatus;
  job_source_type: JobSourceType;
  user_message?: string | null;
  intake_source_cv_id?: string | null;
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
    const { data, error } = await supabase
      .from('job_application')
      .select('*')
      .order('updated_at', { ascending: false });

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
