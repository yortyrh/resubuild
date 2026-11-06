import { Inject, Injectable } from '@nestjs/common';
import { and, type Database, desc, eq, inArray, jobApplication } from '@resubuild/db';
import type {
  JobApplicationJobSummary,
  JobApplicationRow,
  JobApplicationStatus,
  JobSourceType,
} from '@resubuild/types';
import type { AuthenticatedRequest } from '../auth/session-auth.guard';
import { DATABASE } from '../database/database.tokens';
import { pickColumns } from '../database/db-scope';

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
  job_source_url?: string | null;
  job_source_file_name?: string | null;
  job_summary?: JobApplicationJobSummary | null;
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
    | 'job_summary'
  >
>;

@Injectable()
export class ApplicationRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private owned(user: AuthenticatedRequest['user']) {
    return eq(jobApplication.user_id, user.id);
  }

  async create(
    user: AuthenticatedRequest['user'],
    input: CreateJobApplicationInput,
  ): Promise<JobApplicationRow> {
    const [row] = await this.db
      .insert(jobApplication)
      .values({
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
        job_source_url: input.job_source_url ?? null,
        job_source_file_name: input.job_source_file_name ?? null,
        job_summary: input.job_summary ?? null,
      })
      .returning();

    return row as JobApplicationRow;
  }

  async findAll(user: AuthenticatedRequest['user']): Promise<JobApplicationRow[]> {
    const rows = await this.db
      .select()
      .from(jobApplication)
      .where(and(this.owned(user), eq(jobApplication.is_list_visible, true)))
      .orderBy(desc(jobApplication.updated_at));

    return rows as JobApplicationRow[];
  }

  async findOne(user: AuthenticatedRequest['user'], id: string): Promise<JobApplicationRow | null> {
    const rows = await this.db
      .select()
      .from(jobApplication)
      .where(and(this.owned(user), eq(jobApplication.id, id)))
      .limit(1);

    return (rows[0] as JobApplicationRow | undefined) ?? null;
  }

  async findActiveUpdateDraft(
    user: AuthenticatedRequest['user'],
    sourceApplicationId: string,
  ): Promise<JobApplicationRow | null> {
    const rows = await this.db
      .select()
      .from(jobApplication)
      .where(
        and(
          this.owned(user),
          eq(jobApplication.source_application_id, sourceApplicationId),
          eq(jobApplication.is_list_visible, false),
          inArray(jobApplication.status, ['queued', 'running']),
        ),
      )
      .orderBy(desc(jobApplication.updated_at))
      .limit(1);

    return (rows[0] as JobApplicationRow | undefined) ?? null;
  }

  async findDanglingUpdateDrafts(
    user: AuthenticatedRequest['user'],
    sourceApplicationId: string,
  ): Promise<JobApplicationRow[]> {
    const rows = await this.db
      .select()
      .from(jobApplication)
      .where(
        and(
          this.owned(user),
          eq(jobApplication.source_application_id, sourceApplicationId),
          eq(jobApplication.is_list_visible, false),
        ),
      );

    return rows as JobApplicationRow[];
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    patch: UpdateJobApplicationInput,
  ): Promise<JobApplicationRow | null> {
    const set = pickColumns(jobApplication, patch as Record<string, unknown>, ['id', 'user_id']);
    if (Object.keys(set).length === 0) {
      return this.findOne(user, id);
    }

    const rows = await this.db
      .update(jobApplication)
      .set(set)
      .where(and(this.owned(user), eq(jobApplication.id, id)))
      .returning();

    return (rows[0] as JobApplicationRow | undefined) ?? null;
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<boolean> {
    const rows = await this.db
      .delete(jobApplication)
      .where(and(this.owned(user), eq(jobApplication.id, id)))
      .returning({ id: jobApplication.id });

    return rows.length > 0;
  }
}
