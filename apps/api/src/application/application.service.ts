import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  applyCoverLetterCandidateName,
  type CvSummaryForRanking,
  type JobSummary,
  type PrepareApplicationProgress,
  runPrepareApplicationWorkflow,
  runUpdateApplicationWorkflow,
  type TailorCvPatch,
} from '@resumind/import-agent';
import type { JobApplicationRow, JobSourceType, Resume } from '@resumind/types';
import {
  assembleResume,
  deriveCvTitleFromBasics,
  jobApplicationRowToDetail,
  sanitizeAiTypography,
  sanitizeAiTypographyDeep,
} from '@resumind/types';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { CvService } from '../cv/cv.service';
import { CvCloneService } from '../cv/cv-clone.service';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { buildCoverLetterExportFilename } from '../cv-export/cv-export.util';
import { PDF_IMPORT_MAX_BYTES_DEFAULT } from '../import/import.service';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ApplicationRepository } from './application.repository';
import { ApplicationPrepareStore, type PrepareIntakeSnapshot } from './application-prepare.store';
import {
  buildSourceCvSnapshot,
  type ResolvedApplicationSource,
  resolveApplicationSource,
  resumeToCvSummary,
} from './application-source-resolver';

export const APPLICATION_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface PrepareApplicationIntake {
  url?: string;
  text?: string;
  message?: string;
  sourceCvId?: string;
  file?: Express.Multer.File;
}

export interface UpdateApplicationIntake {
  message?: string;
  sourceCvId?: string;
}

@Injectable()
export class ApplicationService {
  private readonly prepareStore = new ApplicationPrepareStore();

  constructor(
    private readonly configService: ConfigService,
    private readonly repository: ApplicationRepository,
    private readonly aiAgentCredentialService: AiAgentCredentialService,
    private readonly catalogService: ImportModelsCatalogService,
    private readonly normalizedRepo: CvNormalizedRepository,
    private readonly cvService: CvService,
    private readonly cvCloneService: CvCloneService,
  ) {}

  isEnabled(): boolean {
    return this.configService.get<string>('APPLICATION_PREPARE_ENABLED', 'true') !== 'false';
  }

  getMaxBytes(): number {
    return Number(
      this.configService.get<string>('PDF_IMPORT_MAX_BYTES') ?? PDF_IMPORT_MAX_BYTES_DEFAULT,
    );
  }

  async prepare(user: AuthenticatedRequest['user'], intake: PrepareApplicationIntake) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Prepare Application is disabled');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);
    const sourceType = this.resolveSourceType(intake);
    this.validateIntake(intake, sourceType);

    const row = await this.repository.create(user, {
      status: 'queued',
      job_source_type: sourceType,
      user_message: intake.message ?? null,
      intake_source_cv_id: intake.sourceCvId ?? null,
    });

    this.prepareStore.init(row.id, user.id, {
      intake: this.buildIntakeSnapshot(intake, sourceType),
    });

    this.enqueuePrepareJob(user, row.id, intake, sourceType, llmConfig.modelId, llmConfig.apiKey);

    return { applicationId: row.id, status: 'queued' as const };
  }

  async cancel(user: AuthenticatedRequest['user'], id: string) {
    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    if (row.status !== 'queued' && row.status !== 'running') {
      throw new BadRequestException('Only queued or running applications can be cancelled');
    }

    this.prepareStore.markCancelled(id);
    await this.repository.update(user, id, { status: 'failed' });
    this.prepareStore.update(id, { errors: ['Cancelled by user'] });

    return jobApplicationRowToDetail(
      { ...row, status: 'failed' },
      { errors: ['Cancelled by user'] },
    );
  }

  async retry(user: AuthenticatedRequest['user'], id: string) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Prepare Application is disabled');
    }

    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    if (row.status !== 'queued' && row.status !== 'running' && row.status !== 'failed') {
      throw new BadRequestException('Only queued, running, or failed applications can be retried');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);
    const storeRecord = this.prepareStore.get(id, user.id);

    if (storeRecord?.intake) {
      await this.repository.update(user, id, { status: 'queued' });
      this.prepareStore.clearCancelled(id);
      this.prepareStore.update(id, { progress: undefined, errors: [] });

      const intake = this.intakeFromSnapshot(storeRecord.intake);
      this.enqueuePrepareJob(
        user,
        id,
        intake,
        storeRecord.intake.sourceType,
        llmConfig.modelId,
        llmConfig.apiKey,
      );

      return { applicationId: id, status: 'queued' as const };
    }

    const jobRawText = row.job_raw_text?.trim();
    if (!jobRawText) {
      throw new BadRequestException(
        'Cannot retry this application. Delete it and start a new prepare from the job form.',
      );
    }

    if (row.tailored_cv_id) {
      await this.repository.update(user, id, { status: 'queued' });
      this.prepareStore.init(id, user.id);
      this.prepareStore.clearCancelled(id);
      this.prepareStore.update(id, { progress: undefined, errors: [] });

      const draft = await this.repository.create(user, {
        status: 'queued',
        job_source_type: row.job_source_type ?? 'text',
        user_message: row.user_message,
        intake_source_cv_id: row.intake_source_cv_id ?? null,
        source_application_id: id,
        is_list_visible: false,
        job_title: row.job_title,
        job_company: row.job_company,
        job_raw_text: row.job_raw_text,
        source_cv_id: row.source_cv_id,
        source_cv_snapshot: row.source_cv_snapshot,
        cover_letter: row.cover_letter,
        cover_letter_email_subject: row.cover_letter_email_subject,
        selection_rationale: row.selection_rationale,
      });
      this.prepareStore.init(draft.id, user.id);

      setImmediate(() => {
        void this.runUpdateJob(
          user,
          draft.id,
          row,
          {
            message: row.user_message ?? undefined,
          },
          llmConfig.modelId,
          llmConfig.apiKey,
        );
      });

      return { applicationId: id, status: 'queued' as const };
    }

    const sourceType = row.job_source_type ?? 'text';
    const textIntake: PrepareApplicationIntake = {
      text: jobRawText,
      message: row.user_message ?? undefined,
    };

    await this.repository.update(user, id, { status: 'queued' });
    this.prepareStore.init(id, user.id, {
      intake: this.buildIntakeSnapshot(textIntake, sourceType),
    });
    this.prepareStore.clearCancelled(id);
    this.prepareStore.update(id, { progress: undefined, errors: [] });

    const resolvedSource = await this.resolveApplicationSourceForRegeneration(user, row);

    this.enqueuePrepareJob(
      user,
      id,
      textIntake,
      sourceType,
      llmConfig.modelId,
      llmConfig.apiKey,
      resolvedSource ?? undefined,
    );

    return { applicationId: id, status: 'queued' as const };
  }

  async findAll(user: AuthenticatedRequest['user']) {
    const rows = await this.repository.findAll(user);
    return rows.map((row) => jobApplicationRowToDetail(row));
  }

  async findOne(user: AuthenticatedRequest['user'], id: string) {
    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    const state = this.prepareStore.get(id, user.id);
    const activeDraft =
      row.is_list_visible !== false ? await this.repository.findActiveUpdateDraft(user, id) : null;
    const coverLetter = await this.enrichCoverLetter(user, row);
    const detail = jobApplicationRowToDetail(
      { ...row, cover_letter: coverLetter },
      {
        progress: state?.progress,
        errors: state?.errors,
        updateInProgress: activeDraft != null,
        updateDraftId: activeDraft?.id,
      },
    );

    if (row.source_cv_id) {
      const supabase = this.normalizedRepo.createClientForUser(user);
      const header = await this.normalizedRepo.fetchHeader(supabase, row.source_cv_id);
      if (header) {
        detail.sourceCvTitle = deriveCvTitleFromBasics({
          name: header.name ?? undefined,
          label: header.label ?? undefined,
        });
        detail.sourceCvFromSnapshot = false;
      }
    }

    return detail;
  }

  async updateCoverLetter(user: AuthenticatedRequest['user'], id: string, coverLetter: string) {
    const existing = await this.repository.findOne(user, id);
    if (!existing) {
      throw new NotFoundException('Application not found');
    }

    const updated = await this.repository.update(user, id, { cover_letter: coverLetter });
    if (!updated) {
      throw new NotFoundException('Application not found');
    }

    return jobApplicationRowToDetail(updated);
  }

  async promoteClone(user: AuthenticatedRequest['user'], id: string) {
    const row = await this.repository.findOne(user, id);
    if (!row?.tailored_cv_id) {
      throw new BadRequestException('Application has no tailored CV to promote');
    }

    await this.cvCloneService.promoteClone(user, row.tailored_cv_id);
    return this.findOne(user, id);
  }

  async updateApplication(
    user: AuthenticatedRequest['user'],
    id: string,
    intake: UpdateApplicationIntake,
  ) {
    if (!this.isEnabled()) {
      throw new ForbiddenException('Prepare Application is disabled');
    }

    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    if (row.status !== 'ready') {
      throw new BadRequestException('Application must be ready before updating');
    }

    if (!row.job_raw_text?.trim()) {
      throw new BadRequestException('Application is missing job posting data');
    }

    if (!row.tailored_cv_id) {
      throw new BadRequestException('Application has no tailored CV to update from');
    }

    const llmConfig = await this.aiAgentCredentialService.getActiveCredentials(user);
    await this.removeDanglingUpdateDrafts(user, id);

    const draft = await this.repository.create(user, {
      status: 'queued',
      job_source_type: row.job_source_type ?? 'text',
      user_message: intake.message ?? row.user_message ?? null,
      intake_source_cv_id: row.intake_source_cv_id ?? null,
      source_application_id: id,
      is_list_visible: false,
      job_title: row.job_title,
      job_company: row.job_company,
      job_raw_text: row.job_raw_text,
      source_cv_id: row.source_cv_id,
      source_cv_snapshot: row.source_cv_snapshot,
      cover_letter: row.cover_letter,
      cover_letter_email_subject: row.cover_letter_email_subject,
      selection_rationale: row.selection_rationale,
    });

    this.prepareStore.init(draft.id, user.id);

    setImmediate(() => {
      void this.runUpdateJob(user, draft.id, row, intake, llmConfig.modelId, llmConfig.apiKey);
    });

    return {
      applicationId: id,
      draftApplicationId: draft.id,
      status: 'queued' as const,
    };
  }

  async getCoverLetterMarkdown(user: AuthenticatedRequest['user'], id: string): Promise<string> {
    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }
    return this.enrichCoverLetter(user, row);
  }

  async getCoverLetterPdfExport(
    user: AuthenticatedRequest['user'],
    id: string,
  ): Promise<{ markdown: string; filename: string }> {
    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    const markdown = await this.enrichCoverLetter(user, row);
    const filename = await this.buildCoverLetterPdfFilename(user, row);
    return { markdown, filename };
  }

  private async buildCoverLetterPdfFilename(
    user: AuthenticatedRequest['user'],
    row: JobApplicationRow,
  ): Promise<string> {
    let name: string | null = null;
    const cvId = row.source_cv_id ?? row.tailored_cv_id;

    if (cvId) {
      const supabase = this.normalizedRepo.createClientForUser(user);
      const header = await this.normalizedRepo.fetchHeader(supabase, cvId);
      name = header?.name?.trim() || null;
    }

    if (!name) {
      name = (await this.resolveAccountDisplayName(user)) || null;
    }

    return buildCoverLetterExportFilename({
      company: row.job_company,
      name,
      label: row.job_title,
    });
  }

  async remove(user: AuthenticatedRequest['user'], id: string): Promise<void> {
    const row = await this.repository.findOne(user, id);
    if (!row) {
      throw new NotFoundException('Application not found');
    }

    if (row.is_list_visible === false && row.source_application_id) {
      await this.removeApplicationWithClone(user, row);
      return;
    }

    const drafts = await this.repository.findDanglingUpdateDrafts(user, id);
    for (const draft of drafts) {
      await this.removeApplicationWithClone(user, draft);
    }

    const removed = await this.repository.remove(user, id);
    if (!removed) {
      throw new NotFoundException('Application not found');
    }

    this.prepareStore.delete(id);

    if (row.tailored_cv_id) {
      try {
        await this.cvService.remove(user, row.tailored_cv_id);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }
  }

  private async enrichCoverLetter(
    user: AuthenticatedRequest['user'],
    row: JobApplicationRow,
  ): Promise<string> {
    let letter = sanitizeAiTypography(row.cover_letter ?? '');
    if (!letter) {
      return letter;
    }

    if (!/\[Your Name\]|\[your name\]|\[Nom\]|\[nom\]/i.test(letter)) {
      return letter;
    }

    let name: string | undefined;
    if (row.source_cv_id) {
      const supabase = this.normalizedRepo.createClientForUser(user);
      const header = await this.normalizedRepo.fetchHeader(supabase, row.source_cv_id);
      name = header?.name?.trim() || undefined;
    }

    if (!name) {
      const resolved = await this.resolveApplicationSourceForRegeneration(user, row);
      name = resolved?.resume.basics?.name?.trim() || undefined;
    }

    if (!name) {
      name = await this.resolveAccountDisplayName(user);
    }

    if (!name) {
      return letter;
    }

    letter = applyCoverLetterCandidateName(letter, name);
    return sanitizeAiTypography(letter);
  }

  private async resolveApplicationSourceForRegeneration(
    user: AuthenticatedRequest['user'],
    row: JobApplicationRow,
  ): Promise<ResolvedApplicationSource | null> {
    const resolved = await resolveApplicationSource(user, row, this.normalizedRepo);
    if (!resolved) {
      return null;
    }

    if (!resolved.fromSnapshot && resolved.liveSourceCvId && !row.source_cv_snapshot) {
      await this.repository.update(user, row.id, {
        source_cv_snapshot: resolved.resume as unknown as Record<string, unknown>,
      });
    }

    return resolved;
  }

  private async resolveLiveSource(
    user: AuthenticatedRequest['user'],
    sourceCvId: string,
  ): Promise<ResolvedApplicationSource | null> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const header = await this.normalizedRepo.fetchHeader(supabase, sourceCvId);
    if (!header || header.kind !== 'primary') {
      return null;
    }

    const resume = await this.normalizedRepo.assembleFullResume(supabase, sourceCvId);
    if (!resume) {
      return null;
    }

    return {
      workflowCvId: sourceCvId,
      liveSourceCvId: sourceCvId,
      resume,
      cvSummary: resumeToCvSummary(resume, sourceCvId),
      fromSnapshot: false,
    };
  }

  private async createTailoredClone(
    user: AuthenticatedRequest['user'],
    resolvedSource: ResolvedApplicationSource | undefined,
    workflowSourceCvId: string,
  ): Promise<{ id: string; sourceCvId: string }> {
    if (resolvedSource?.fromSnapshot) {
      return this.cvCloneService.cloneFromResume(user, resolvedSource.resume, {
        kind: 'application_clone',
        sourceCvId: resolvedSource.liveSourceCvId,
      });
    }

    const liveSourceCvId = resolvedSource?.liveSourceCvId ?? workflowSourceCvId;
    return this.cvCloneService.deepClone(user, liveSourceCvId, {
      kind: 'application_clone',
    });
  }

  private async buildPersistedSourceSnapshot(
    user: AuthenticatedRequest['user'],
    resolvedSource: ResolvedApplicationSource | undefined,
    workflowSourceCvId: string,
  ): Promise<Resume> {
    if (resolvedSource?.fromSnapshot) {
      return resolvedSource.resume;
    }

    const liveSourceCvId = resolvedSource?.liveSourceCvId ?? workflowSourceCvId;
    const snapshot = await buildSourceCvSnapshot(user, liveSourceCvId, this.normalizedRepo);
    if (!snapshot) {
      throw new NotFoundException('Source CV not found');
    }

    return snapshot;
  }

  private resolveSourceType(intake: PrepareApplicationIntake): JobSourceType {
    if (intake.file) {
      if (intake.file.mimetype === 'application/pdf') return 'pdf';
      if (APPLICATION_IMAGE_MIME_TYPES.has(intake.file.mimetype)) return 'image';
      throw new BadRequestException('File must be PDF or image (PNG, JPEG, WebP)');
    }
    if (intake.url?.trim()) return 'url';
    if (intake.text?.trim()) return 'text';
    throw new BadRequestException('Provide a job URL, text, or file');
  }

  private validateIntake(intake: PrepareApplicationIntake, sourceType: JobSourceType): void {
    if (intake.file && intake.file.size > this.getMaxBytes()) {
      throw new BadRequestException(`File exceeds maximum size of ${this.getMaxBytes()} bytes`);
    }

    if (sourceType === 'url' && !intake.url?.trim()) {
      throw new BadRequestException('Job URL is required');
    }

    if (sourceType === 'text' && !intake.text?.trim()) {
      throw new BadRequestException('Job text is required');
    }
  }

  private buildIntakeSnapshot(
    intake: PrepareApplicationIntake,
    sourceType: JobSourceType,
  ): PrepareIntakeSnapshot {
    return {
      sourceType,
      url: intake.url,
      text: intake.text,
      message: intake.message,
      sourceCvId: intake.sourceCvId,
      pdfBuffer: sourceType === 'pdf' ? intake.file?.buffer : undefined,
      imageBuffer: sourceType === 'image' ? intake.file?.buffer : undefined,
      imageMimeType: intake.file?.mimetype,
    };
  }

  private intakeFromSnapshot(snapshot: PrepareIntakeSnapshot): PrepareApplicationIntake {
    return {
      url: snapshot.url,
      text: snapshot.text,
      message: snapshot.message,
      sourceCvId: snapshot.sourceCvId,
      file:
        snapshot.pdfBuffer || snapshot.imageBuffer
          ? ({
              mimetype:
                snapshot.sourceType === 'pdf'
                  ? 'application/pdf'
                  : (snapshot.imageMimeType ?? 'image/png'),
              buffer: snapshot.pdfBuffer ?? snapshot.imageBuffer!,
              size: (snapshot.pdfBuffer ?? snapshot.imageBuffer)!.length,
            } as Express.Multer.File)
          : undefined,
    };
  }

  private enqueuePrepareJob(
    user: AuthenticatedRequest['user'],
    applicationId: string,
    intake: PrepareApplicationIntake,
    sourceType: JobSourceType,
    modelId: string,
    apiKey: string,
    forcedSource?: ResolvedApplicationSource,
  ): void {
    setImmediate(() => {
      void this.runPrepareJob(
        user,
        applicationId,
        intake,
        sourceType,
        modelId,
        apiKey,
        forcedSource,
      );
    });
  }

  private async runPrepareJob(
    user: AuthenticatedRequest['user'],
    applicationId: string,
    intake: PrepareApplicationIntake,
    sourceType: JobSourceType,
    modelId: string,
    apiKey: string,
    forcedSource?: ResolvedApplicationSource,
  ): Promise<void> {
    if (this.prepareStore.isCancelled(applicationId)) {
      return;
    }

    await this.repository.update(user, applicationId, { status: 'running' });

    try {
      const cvSummaries = forcedSource
        ? [forcedSource.cvSummary]
        : await this.buildCvSummaries(user);
      const accountDisplayName = await this.resolveAccountDisplayName(user);
      const sourceCvId = forcedSource?.workflowCvId ?? intake.sourceCvId;

      if (!forcedSource && intake.sourceCvId) {
        const owned = cvSummaries.some((cv) => cv.id === intake.sourceCvId);
        if (!owned) {
          throw new BadRequestException('Selected source CV is not in your library');
        }
      }

      const result = await this.withScopedApiKey(modelId, apiKey, async () =>
        runPrepareApplicationWorkflow({
          sourceType,
          url: intake.url,
          text: intake.text,
          pdfBuffer: sourceType === 'pdf' ? intake.file?.buffer : undefined,
          imageBuffer: sourceType === 'image' ? intake.file?.buffer : undefined,
          imageMimeType: intake.file?.mimetype,
          userMessage: intake.message,
          sourceCvId,
          cvSummaries,
          accountDisplayName,
          modelId,
          apiKey,
          onProgress: (progress: PrepareApplicationProgress) => {
            if (this.prepareStore.isCancelled(applicationId)) return;
            this.prepareStore.update(applicationId, { progress });
          },
        }),
      );

      if (this.prepareStore.isCancelled(applicationId)) {
        return;
      }

      if (result.errors.length > 0 || !result.sourceCvId) {
        throw new Error(result.errors[0] ?? 'Prepare workflow failed');
      }

      this.prepareStore.update(applicationId, { progress: 'finalizing' });

      const resolvedSource =
        forcedSource ?? (await this.resolveLiveSource(user, result.sourceCvId)) ?? undefined;

      const clone = await this.createTailoredClone(user, resolvedSource, result.sourceCvId);

      await this.applyTailorPatch(user, clone.id, result.tailorPatch);

      if (this.prepareStore.isCancelled(applicationId)) {
        try {
          await this.cvService.remove(user, clone.id);
        } catch (error) {
          if (!(error instanceof NotFoundException)) {
            throw error;
          }
        }
        return;
      }

      const sourceCvSnapshot = await this.buildPersistedSourceSnapshot(
        user,
        resolvedSource,
        result.sourceCvId,
      );

      await this.repository.update(user, applicationId, {
        status: 'ready',
        job_title: result.jobSummary.title,
        job_company: result.jobSummary.company,
        job_raw_text: result.jobRawText,
        source_cv_id: resolvedSource?.liveSourceCvId ?? null,
        source_cv_snapshot: sourceCvSnapshot as unknown as Record<string, unknown>,
        tailored_cv_id: clone.id,
        cover_letter: result.coverLetter,
        cover_letter_email_subject: result.coverLetterEmailSubject,
        selection_rationale: forcedSource?.fromSnapshot
          ? sanitizeAiTypography(`${result.selectionRationale} (using saved base CV copy)`)
          : result.selectionRationale,
        user_message: intake.message ?? null,
        intake_source_cv_id: resolvedSource?.liveSourceCvId ?? intake.sourceCvId ?? null,
      });

      this.prepareStore.update(applicationId, { progress: 'finalizing', errors: [] });
    } catch (error) {
      if (this.prepareStore.isCancelled(applicationId)) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Prepare application failed';
      const errors = /auth|api key|401|403/i.test(message)
        ? ['Prepare failed. Update your AI agent settings and verify the API key.']
        : [message];
      await this.repository.update(user, applicationId, { status: 'failed' });
      this.prepareStore.update(applicationId, { errors });
    }
  }

  private buildJobSummaryFromRow(row: JobApplicationRow): JobSummary {
    return {
      title: row.job_title?.trim() || 'Role',
      company: row.job_company?.trim() || 'Company',
      requirements: [],
      keywords: [],
    };
  }

  private async removeDanglingUpdateDrafts(
    user: AuthenticatedRequest['user'],
    sourceApplicationId: string,
  ): Promise<void> {
    const drafts = await this.repository.findDanglingUpdateDrafts(user, sourceApplicationId);
    for (const draft of drafts) {
      await this.removeApplicationWithClone(user, draft);
    }
  }

  private async removeApplicationWithClone(
    user: AuthenticatedRequest['user'],
    row: JobApplicationRow,
  ): Promise<void> {
    const tailoredCvId = row.tailored_cv_id;
    await this.repository.remove(user, row.id);
    this.prepareStore.delete(row.id);

    if (tailoredCvId) {
      try {
        await this.cvService.remove(user, tailoredCvId);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }
  }

  private async completeUpdateSwap(
    user: AuthenticatedRequest['user'],
    draft: JobApplicationRow,
    original: JobApplicationRow,
  ): Promise<void> {
    if (draft.source_application_id !== original.id) {
      throw new BadRequestException('Update draft does not match the original application');
    }

    const activated = await this.repository.update(user, draft.id, {
      is_list_visible: true,
      source_application_id: null,
    });
    if (!activated) {
      throw new NotFoundException('Update draft not found');
    }

    const originalTailoredCvId = original.tailored_cv_id;
    const removed = await this.repository.remove(user, original.id);
    if (!removed) {
      throw new NotFoundException('Original application not found');
    }

    this.prepareStore.delete(original.id);

    if (originalTailoredCvId) {
      try {
        await this.cvService.remove(user, originalTailoredCvId);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }
  }

  private async runUpdateJob(
    user: AuthenticatedRequest['user'],
    draftApplicationId: string,
    originalRow: JobApplicationRow,
    intake: UpdateApplicationIntake,
    modelId: string,
    apiKey: string,
  ): Promise<void> {
    if (this.prepareStore.isCancelled(draftApplicationId)) {
      return;
    }

    const draftRow = await this.repository.findOne(user, draftApplicationId);
    if (!draftRow) {
      return;
    }

    const sourceTailoredCvId = originalRow.tailored_cv_id;
    if (!sourceTailoredCvId) {
      await this.repository.update(user, draftApplicationId, { status: 'failed' });
      this.prepareStore.update(draftApplicationId, { errors: ['Tailored CV not found'] });
      return;
    }

    const supabase = this.normalizedRepo.createClientForUser(user);
    const currentResume = await this.normalizedRepo.assembleFullResume(
      supabase,
      sourceTailoredCvId,
    );
    if (!currentResume) {
      await this.repository.update(user, draftApplicationId, { status: 'failed' });
      this.prepareStore.update(draftApplicationId, { errors: ['Tailored CV not found'] });
      return;
    }

    const currentCoverLetter = originalRow.cover_letter ?? '';

    await this.repository.update(user, draftApplicationId, { status: 'running' });

    try {
      const resolvedSource = await this.resolveApplicationSourceForRegeneration(user, originalRow);
      if (!resolvedSource) {
        throw new BadRequestException(
          'Cannot regenerate this application because its base CV is no longer available.',
        );
      }

      const cvSummaries = [resolvedSource.cvSummary];
      const accountDisplayName = await this.resolveAccountDisplayName(user);
      const jobRawText = originalRow.job_raw_text!.trim();
      const jobSummary = this.buildJobSummaryFromRow(originalRow);

      const result = await this.withScopedApiKey(modelId, apiKey, async () =>
        runUpdateApplicationWorkflow({
          jobSummary,
          jobRawText,
          userMessage: intake.message,
          sourceCvId: resolvedSource.workflowCvId,
          currentResume: currentResume as unknown as Record<string, unknown>,
          currentCoverLetter,
          cvSummaries,
          accountDisplayName,
          modelId,
          apiKey,
          onProgress: (progress: PrepareApplicationProgress) => {
            if (this.prepareStore.isCancelled(draftApplicationId)) return;
            this.prepareStore.update(draftApplicationId, { progress });
          },
        }),
      );

      if (this.prepareStore.isCancelled(draftApplicationId)) {
        return;
      }

      if (result.errors.length > 0 || !result.sourceCvId) {
        throw new Error(result.errors[0] ?? 'Update workflow failed');
      }

      this.prepareStore.update(draftApplicationId, { progress: 'finalizing' });

      const clone = await this.createTailoredClone(user, resolvedSource, result.sourceCvId);

      await this.applyTailorPatch(user, clone.id, result.tailorPatch);

      if (this.prepareStore.isCancelled(draftApplicationId)) {
        try {
          await this.cvService.remove(user, clone.id);
        } catch (error) {
          if (!(error instanceof NotFoundException)) {
            throw error;
          }
        }
        return;
      }

      const sourceCvSnapshot = await this.buildPersistedSourceSnapshot(
        user,
        resolvedSource,
        result.sourceCvId,
      );

      const draftReady = await this.repository.update(user, draftApplicationId, {
        status: 'ready',
        source_cv_id: resolvedSource.liveSourceCvId ?? originalRow.source_cv_id,
        source_cv_snapshot: sourceCvSnapshot as unknown as Record<string, unknown>,
        tailored_cv_id: clone.id,
        cover_letter: result.coverLetter,
        cover_letter_email_subject: result.coverLetterEmailSubject,
        selection_rationale: resolvedSource.fromSnapshot
          ? sanitizeAiTypography(`${result.selectionRationale} (using saved base CV copy)`)
          : result.selectionRationale,
        user_message: intake.message ?? originalRow.user_message ?? null,
        intake_source_cv_id:
          resolvedSource.liveSourceCvId ?? originalRow.intake_source_cv_id ?? null,
      });

      if (!draftReady) {
        throw new NotFoundException('Update draft not found');
      }

      await this.completeUpdateSwap(user, draftReady, originalRow);

      this.prepareStore.update(draftApplicationId, { progress: 'finalizing', errors: [] });
    } catch (error) {
      if (this.prepareStore.isCancelled(draftApplicationId)) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Update application failed';
      const errors = /auth|api key|401|403/i.test(message)
        ? ['Update failed. Update your AI agent settings and verify the API key.']
        : [message];
      await this.repository.update(user, draftApplicationId, { status: 'failed' });
      this.prepareStore.update(draftApplicationId, { errors });
    }
  }

  private async resolveAccountDisplayName(
    user: AuthenticatedRequest['user'],
  ): Promise<string | undefined> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const metadata = authUser?.user_metadata as Record<string, unknown> | undefined;
    const candidates = [metadata?.full_name, metadata?.name, metadata?.display_name];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private async buildCvSummaries(
    user: AuthenticatedRequest['user'],
  ): Promise<CvSummaryForRanking[]> {
    const cvs = await this.cvService.findAll(user);
    const supabase = this.normalizedRepo.createClientForUser(user);

    return Promise.all(
      cvs.map(async (cv) => {
        const header = await this.normalizedRepo.fetchHeader(supabase, cv.id);
        const sections = await this.normalizedRepo.fetchSections(supabase, cv.id);
        const resume = assembleResume(header!, sections);

        return {
          id: cv.id,
          title: deriveCvTitleFromBasics(resume.basics),
          name: resume.basics?.name?.trim() || undefined,
          label: resume.basics?.label,
          summary: resume.basics?.summary,
          workHighlights: (resume.work ?? []).flatMap((w) => w.highlights ?? []).slice(0, 12),
          skills: (resume.skills ?? [])
            .map((s) => s.name ?? '')
            .filter(Boolean)
            .slice(0, 20),
        };
      }),
    );
  }

  async applyTailorPatch(
    user: AuthenticatedRequest['user'],
    cloneCvId: string,
    patch: TailorCvPatch,
  ): Promise<void> {
    const supabase = this.normalizedRepo.createClientForUser(user);
    const resume = await this.normalizedRepo.assembleFullResume(supabase, cloneCvId);
    if (!resume) {
      throw new NotFoundException('Clone CV not found');
    }

    const next = structuredClone(resume) as Resume;

    if (patch.basics?.label) {
      next.basics = { ...next.basics, label: patch.basics.label };
    }

    applySectionPatches(next.work, patch.work);
    applySectionPatches(next.volunteer, patch.volunteer);
    applySectionPatches(next.projects, patch.projects);

    const sanitized = sanitizeAiTypographyDeep(next) as Resume;
    await this.normalizedRepo.replaceNormalizedCv(supabase, cloneCvId, sanitized);
  }

  private resolveApiKeyEnvVar(modelId: string): string | null {
    for (const provider of this.catalogService.getCatalog().providers) {
      if (provider.models.some((model) => model.id === modelId)) {
        return provider.apiKeyEnvVar;
      }
    }
    return null;
  }

  private async withScopedApiKey<T>(
    modelId: string,
    apiKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const envVar = this.resolveApiKeyEnvVar(modelId);
    if (!envVar) {
      return action();
    }

    const previous = process.env[envVar];
    process.env[envVar] = apiKey;
    try {
      return await action();
    } finally {
      if (previous === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = previous;
      }
    }
  }
}

function applySectionPatches<T extends { summary?: string; highlights?: string[] }>(
  items: T[] | undefined,
  patches?: Array<{ index: number; summary?: string; highlights?: string[] }>,
): void {
  if (!items || !patches?.length) return;

  for (const patch of patches) {
    const item = items[patch.index];
    if (!item) continue;
    if (patch.summary !== undefined) {
      item.summary = patch.summary;
    }
    if (patch.highlights !== undefined) {
      item.highlights = patch.highlights;
    }
  }
}
