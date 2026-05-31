import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  runPrepareApplicationWorkflow,
  runUpdateApplicationWorkflow,
} from '@resumind/import-agent';
import type { ImportModelCatalog } from '@resumind/import-models';
import catalog from '@resumind/import-models/catalog.json';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import { CvService } from '../cv/cv.service';
import { CvCloneService } from '../cv/cv-clone.service';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { mockCvHeader } from '../cv/cv-test.helpers';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ApplicationRepository } from './application.repository';
import { ApplicationService } from './application.service';

const testCatalog = catalog as ImportModelCatalog;

jest.mock('@resumind/import-agent', () => {
  const actual =
    jest.requireActual<typeof import('@resumind/import-agent')>('@resumind/import-agent');
  return {
    ...actual,
    runPrepareApplicationWorkflow: jest.fn(),
    runUpdateApplicationWorkflow: jest.fn(),
  };
});

describe('ApplicationService', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as never;

  let service: ApplicationService;
  const repository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const aiAgentCredentialService = {
    getActiveCredentials: jest.fn(),
  };
  const catalogService = {
    getCatalog: jest.fn().mockReturnValue(testCatalog),
  };
  const normalizedRepo = {
    createClientForUser: jest.fn(),
    fetchHeader: jest.fn(),
    fetchSections: jest.fn(),
    assembleFullResume: jest.fn(),
    replaceNormalizedCv: jest.fn(),
  };
  const cvService = {
    findAll: jest.fn(),
    remove: jest.fn(),
  };
  const cvCloneService = {
    deepClone: jest.fn(),
    promoteClone: jest.fn(),
  };
  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { user_metadata: {} } } }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    normalizedRepo.createClientForUser.mockReturnValue(supabase);
    normalizedRepo.fetchHeader.mockResolvedValue(null);
    normalizedRepo.fetchSections.mockResolvedValue({
      profiles: [],
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    });
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'key',
      accountId: 'acc',
    });
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'APPLICATION_PREPARE_ENABLED' ? 'true' : undefined,
            ),
          },
        },
        { provide: ApplicationRepository, useValue: repository },
        { provide: AiAgentCredentialService, useValue: aiAgentCredentialService },
        { provide: ImportModelsCatalogService, useValue: catalogService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvService, useValue: cvService },
        { provide: CvCloneService, useValue: cvCloneService },
      ],
    }).compile();

    service = module.get(ApplicationService);
  });

  async function flushBackgroundJobs() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  it('requires active AI agent account for prepare', async () => {
    aiAgentCredentialService.getActiveCredentials.mockRejectedValue(
      new ForbiddenException('Active AI agent configuration is required'),
    );

    await expect(service.prepare(user, { text: 'Job posting text here' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects prepare when feature is disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'APPLICATION_PREPARE_ENABLED' ? 'false' : undefined,
            ),
          },
        },
        { provide: ApplicationRepository, useValue: repository },
        { provide: AiAgentCredentialService, useValue: aiAgentCredentialService },
        { provide: ImportModelsCatalogService, useValue: catalogService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvService, useValue: cvService },
        { provide: CvCloneService, useValue: cvCloneService },
      ],
    }).compile();
    const disabledService = module.get(ApplicationService);

    await expect(disabledService.prepare(user, { text: 'Job posting text here' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects oversize files', async () => {
    await expect(
      service.prepare(user, {
        file: {
          mimetype: 'application/pdf',
          size: 6 * 1024 * 1024,
          buffer: Buffer.from('pdf'),
        } as Express.Multer.File,
      }),
    ).rejects.toThrow(/maximum size/i);
  });

  it('rejects empty intake', async () => {
    await expect(service.prepare(user, {})).rejects.toThrow(BadRequestException);
  });

  it('enqueues prepare workflow and completes successfully', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'We need an engineer',
      coverLetter: 'Dear team',
      coverLetterEmailSubject: 'Application',
      selectionRationale: 'Strong match',
      tailorPatch: { basics: { label: 'Senior Engineer' } },
      errors: [],
    });
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe', label: 'Senior Engineer' },
      work: [],
      skills: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'ready' });

    await expect(service.prepare(user, { text: 'We need an engineer' })).resolves.toEqual({
      applicationId: 'app-1',
      status: 'queued',
    });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'running' });
    expect(runPrepareApplicationWorkflow).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ status: 'ready', tailored_cv_id: 'clone-1' }),
    );
  });

  it('marks prepare failed when workflow returns errors', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: undefined,
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'text',
      coverLetter: '',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: ['No matching CV'],
    });

    await service.prepare(user, { text: 'We need an engineer' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('maps auth failures to a friendly prepare error', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockRejectedValue(new Error('401 invalid api key'));

    await service.prepare(user, { text: 'We need an engineer' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('lists applications', async () => {
    repository.findAll.mockResolvedValue([
      { id: 'app-1', status: 'ready', job_title: 'Engineer', job_company: 'Acme' },
    ]);

    await expect(service.findAll(user)).resolves.toEqual([
      expect.objectContaining({ id: 'app-1', status: 'ready' }),
    ]);
  });

  it('finds one application with store progress', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'running',
      cover_letter: 'Dear team',
    });

    const detail = await service.findOne(user, 'app-1');

    expect(detail.id).toBe('app-1');
    expect(detail.coverLetter).toBe('Dear team');
  });

  it('throws when application is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('updates cover letter markdown', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', cover_letter: 'Old' });
    repository.update.mockResolvedValue({ id: 'app-1', cover_letter: 'New letter' });

    await expect(service.updateCoverLetter(user, 'app-1', 'New letter')).resolves.toEqual(
      expect.objectContaining({ coverLetter: 'New letter' }),
    );
  });

  it('promotes tailored clone', async () => {
    repository.findOne
      .mockResolvedValueOnce({ id: 'app-1', tailored_cv_id: 'clone-1' })
      .mockResolvedValueOnce({ id: 'app-1', tailored_cv_id: 'clone-1', status: 'ready' });
    cvCloneService.promoteClone.mockResolvedValue({ id: 'promoted-1', sourceCvId: 'clone-1' });

    await expect(service.promoteClone(user, 'app-1')).resolves.toEqual(
      expect.objectContaining({ id: 'app-1' }),
    );
    expect(cvCloneService.promoteClone).toHaveBeenCalledWith(user, 'clone-1');
  });

  it('rejects promote when tailored clone is missing', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: null });

    await expect(service.promoteClone(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('queues update workflow for ready applications', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    normalizedRepo.assembleFullResume
      .mockResolvedValueOnce({ basics: { name: 'Jane Doe' }, work: [], skills: [] })
      .mockResolvedValueOnce({ basics: { name: 'Jane Doe', label: 'Lead' }, work: [], skills: [] });
    jest.mocked(runUpdateApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      coverLetter: 'Updated letter',
      coverLetterEmailSubject: 'Updated subject',
      selectionRationale: 'Updated rationale',
      tailorPatch: { basics: { label: 'Lead Engineer' } },
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-2', sourceCvId: 'cv-1' });
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    const result = await service.updateApplication(user, 'app-1', {
      message: 'Emphasize leadership',
    });

    expect(result).toEqual({ applicationId: 'app-1', status: 'queued' });
    await flushBackgroundJobs();
    expect(runUpdateApplicationWorkflow).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ status: 'ready', tailored_cv_id: 'clone-2' }),
    );
  });

  it('rejects update when application is not ready', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'running' });

    await expect(service.updateApplication(user, 'app-1', {})).rejects.toThrow(BadRequestException);
  });

  it('substitutes candidate name in cover letter export', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team,\n\n**[Your Name]**',
      source_cv_id: 'cv-1',
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: 'Jane Doe' });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toContain('Jane Doe');
  });

  it('removes application and tailored clone', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: 'clone-1' });
    repository.remove.mockResolvedValue(true);
    cvService.remove.mockResolvedValue(undefined);

    await service.remove(user, 'app-1');

    expect(repository.remove).toHaveBeenCalledWith(user, 'app-1');
    expect(cvService.remove).toHaveBeenCalledWith(user, 'clone-1');
  });

  it('cancels a queued application', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'queued', user_id: 'u1' });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'failed' });

    const result = await service.cancel(user, 'app-1');

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
    expect(result.status).toBe('failed');
    expect(result.errors).toContain('Cancelled by user');
  });

  it('rejects cancel when application is ready', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'ready' });

    await expect(service.cancel(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('retries failed application from stored intake snapshot', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'failed',
      job_source_type: 'text',
    });
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();
    jest.clearAllMocks();
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'key',
      accountId: 'acc',
    });

    const result = await service.retry(user, 'app-1');

    expect(result.status).toBe('queued');
    await flushBackgroundJobs();
    expect(runPrepareApplicationWorkflow).toHaveBeenCalled();
  });

  it('retries update workflow when tailored clone exists', async () => {
    const failedRow = {
      id: 'app-1',
      status: 'failed',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      job_title: 'Engineer',
      job_company: 'Acme',
      cover_letter: 'Old letter',
    };
    repository.findOne.mockResolvedValue(failedRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...failedRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    normalizedRepo.assembleFullResume
      .mockResolvedValueOnce({ basics: { name: 'Jane' }, work: [], skills: [] })
      .mockResolvedValueOnce({ basics: { name: 'Jane', label: 'Lead' }, work: [], skills: [] });
    jest.mocked(runUpdateApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      coverLetter: 'Updated',
      coverLetterEmailSubject: 'Subject',
      selectionRationale: 'Rationale',
      tailorPatch: { basics: { label: 'Lead Engineer' } },
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-2', sourceCvId: 'cv-1' });
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    const result = await service.retry(user, 'app-1');

    expect(result.status).toBe('queued');
    await flushBackgroundJobs();
    expect(runUpdateApplicationWorkflow).toHaveBeenCalled();
  });

  it('sanitizes AI typography in stored tailored CV content', async () => {
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: {
        name: 'Thomas Davis',
        summary: 'Full stack developer — generative AI',
      },
      work: [{ summary: 'Led teams — shipped features', highlights: ['APIs — scale'] }],
    });
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    await service.applyTailorPatch(user, 'clone-1', {});

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalledWith(supabase, 'clone-1', {
      basics: {
        name: 'Thomas Davis',
        summary: 'Full stack developer - generative AI',
      },
      work: [{ summary: 'Led teams - shipped features', highlights: ['APIs - scale'] }],
    });
  });

  it('rejects retry when job text is missing and no intake snapshot exists', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'failed',
      job_raw_text: null,
      tailored_cv_id: null,
    });

    await expect(service.retry(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects cancel when application is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.cancel(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('rejects remove when application row is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('rejects update when job posting data is missing', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'ready',
      job_raw_text: '   ',
      tailored_cv_id: 'clone-1',
    });

    await expect(service.updateApplication(user, 'app-1', {})).rejects.toThrow(BadRequestException);
  });

  it('rejects prepare with unsupported file type', async () => {
    await expect(
      service.prepare(user, {
        file: {
          mimetype: 'application/zip',
          size: 100,
          buffer: Buffer.from('zip'),
        } as Express.Multer.File,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when applyTailorPatch target clone is missing', async () => {
    normalizedRepo.assembleFullResume.mockResolvedValue(null);

    await expect(service.applyTailorPatch(user, 'missing-clone', {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('applies section patches when tailoring a clone', async () => {
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [{ summary: 'Built APIs', highlights: ['Scale'] }],
      volunteer: [{ summary: 'Mentored', highlights: ['Teams'] }],
      projects: [{ summary: 'Side project', highlights: ['OSS'] }],
    });
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    await service.applyTailorPatch(user, 'clone-1', {
      basics: { label: 'Lead Engineer' },
      work: [{ index: 0, summary: 'Built **APIs**', highlights: ['Scale'] }],
      volunteer: [{ index: 0, highlights: ['Teams'] }],
      projects: [{ index: 0, summary: 'Side project' }],
    });

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalledWith(
      supabase,
      'clone-1',
      expect.objectContaining({
        basics: expect.objectContaining({ label: 'Lead Engineer' }),
        work: [expect.objectContaining({ summary: expect.stringContaining('APIs') })],
      }),
    );
  });

  it('ignores section patches that target missing indexes', async () => {
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [{ summary: 'Built APIs' }],
    });
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    await service.applyTailorPatch(user, 'clone-1', {
      work: [{ index: 99, summary: 'Should be ignored' }],
    });

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalledWith(
      supabase,
      'clone-1',
      expect.objectContaining({
        work: [{ summary: 'Built APIs' }],
      }),
    );
  });

  it('skips empty section patch lists during tailoring', async () => {
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe', label: 'Engineer' },
      work: [{ summary: 'Built APIs' }],
    });
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(undefined);

    await service.applyTailorPatch(user, 'clone-1', { work: [] });

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalledWith(
      supabase,
      'clone-1',
      expect.objectContaining({
        work: [{ summary: 'Built APIs' }],
      }),
    );
  });

  it('ignores missing clone removal errors during application delete', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: 'clone-1' });
    repository.remove.mockResolvedValue(true);
    cvService.remove.mockRejectedValue(new NotFoundException('Clone missing'));

    await expect(service.remove(user, 'app-1')).resolves.toBeUndefined();
  });

  it('rethrows unexpected clone removal errors during application delete', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: 'clone-1' });
    repository.remove.mockResolvedValue(true);
    cvService.remove.mockRejectedValue(new BadRequestException('Cannot delete clone'));

    await expect(service.remove(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('rejects prepare when selected source CV is not owned', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);

    await service.prepare(user, { text: 'Job text', sourceCvId: 'missing-cv' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
    expect(runPrepareApplicationWorkflow).not.toHaveBeenCalled();
  });

  it('rejects retry when prepare feature is disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'APPLICATION_PREPARE_ENABLED' ? 'false' : undefined,
            ),
          },
        },
        { provide: ApplicationRepository, useValue: repository },
        { provide: AiAgentCredentialService, useValue: aiAgentCredentialService },
        { provide: ImportModelsCatalogService, useValue: catalogService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvService, useValue: cvService },
        { provide: CvCloneService, useValue: cvCloneService },
      ],
    }).compile();
    const disabledService = module.get(ApplicationService);

    await expect(disabledService.retry(user, 'app-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects retry for ready applications', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'ready' });

    await expect(service.retry(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('reads configured max bytes from environment', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'APPLICATION_PREPARE_ENABLED') return 'true';
              if (key === 'PDF_IMPORT_MAX_BYTES') return '2048';
              return undefined;
            }),
          },
        },
        { provide: ApplicationRepository, useValue: repository },
        { provide: AiAgentCredentialService, useValue: aiAgentCredentialService },
        { provide: ImportModelsCatalogService, useValue: catalogService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvService, useValue: cvService },
        { provide: CvCloneService, useValue: cvCloneService },
      ],
    }).compile();
    const configuredService = module.get(ApplicationService);

    expect(configuredService.getMaxBytes()).toBe(2048);
  });

  it('throws when cover letter update returns no row', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', cover_letter: 'Old' });
    repository.update.mockResolvedValue(null);

    await expect(service.updateCoverLetter(user, 'app-1', 'New letter')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('builds cover letter PDF filename from account metadata when CV name is missing', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team',
      job_company: 'Acme Corp',
      job_title: 'Engineering Manager',
      source_cv_id: null,
      tailored_cv_id: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { full_name: 'Thomas Davis' } } },
    });

    const result = await service.getCoverLetterPdfExport(user, 'app-1');

    expect(result.filename).toBe('acme-corp-thomas-davis-engineering-manager.pdf');
  });

  it('returns empty cover letter when application has no letter content', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: null,
      source_cv_id: 'cv-1',
    });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toBe('');
  });

  it('returns cover letter unchanged when source CV is not linked', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team,\n\n**[Your Name]**',
      source_cv_id: null,
    });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toContain('[Your Name]');
  });

  it('builds cover letter PDF filename from CV header name', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team',
      job_company: 'Acme Corp',
      job_title: 'Engineer',
      source_cv_id: 'cv-1',
      tailored_cv_id: null,
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: 'Jane Doe' });

    const result = await service.getCoverLetterPdfExport(user, 'app-1');

    expect(result.filename).toBe('acme-corp-jane-doe-engineer.pdf');
  });

  it('throws when cover letter markdown export target is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getCoverLetterMarkdown(user, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when cover letter PDF export target is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.getCoverLetterPdfExport(user, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when cover letter update target is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.updateCoverLetter(user, 'missing', 'Letter')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when remove succeeds at row lookup but delete returns false', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: null });
    repository.remove.mockResolvedValue(false);

    await expect(service.remove(user, 'app-1')).rejects.toThrow(NotFoundException);
  });

  it('returns cover letter unchanged when no name placeholder is present', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear hiring manager',
      source_cv_id: 'cv-1',
    });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toBe(
      'Dear hiring manager',
    );
  });

  it('returns cover letter unchanged when candidate name cannot be resolved', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team,\n\n**[Your Name]**',
      source_cv_id: 'cv-1',
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: '   ' });
    supabase.auth.getUser.mockResolvedValue({ data: { user: { user_metadata: {} } } });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toContain('[Your Name]');
  });

  it('substitutes French name placeholder in cover letter export', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Bonjour,\n\n[Nom]',
      source_cv_id: 'cv-1',
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: 'Marie Curie' });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toContain('Marie Curie');
  });

  it('rejects update when feature is disabled', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'APPLICATION_PREPARE_ENABLED' ? 'false' : undefined,
            ),
          },
        },
        { provide: ApplicationRepository, useValue: repository },
        { provide: AiAgentCredentialService, useValue: aiAgentCredentialService },
        { provide: ImportModelsCatalogService, useValue: catalogService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvService, useValue: cvService },
        { provide: CvCloneService, useValue: cvCloneService },
      ],
    }).compile();
    const disabledService = module.get(ApplicationService);

    await expect(disabledService.updateApplication(user, 'app-1', {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects update when application is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.updateApplication(user, 'missing', {})).rejects.toThrow(NotFoundException);
  });

  it('rejects update when tailored clone is missing', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: null,
    });

    await expect(service.updateApplication(user, 'app-1', {})).rejects.toThrow(BadRequestException);
  });

  it('rejects retry when application is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.retry(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('retries failed application from stored job text without a tailored clone', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      status: 'failed',
      job_raw_text: 'Stored job text',
      tailored_cv_id: null,
      job_source_type: 'text',
      user_message: 'Focus on backend',
      intake_source_cv_id: 'cv-1',
    });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([{ id: 'cv-1' }]);
    normalizedRepo.fetchHeader.mockResolvedValue(
      mockCvHeader({ id: 'cv-1', name: 'Jane Doe', label: 'Engineer', summary: 'Backend' }),
    );
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Stored job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: 'Subject',
      selectionRationale: 'Match',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    const result = await service.retry(user, 'app-1');

    expect(result.status).toBe('queued');
    await flushBackgroundJobs();
    expect(runPrepareApplicationWorkflow).toHaveBeenCalled();
  });

  it('retries queued application from stored intake snapshot', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();
    jest.clearAllMocks();
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'key',
      accountId: 'acc',
    });
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'queued' });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'queued' });

    const result = await service.retry(user, 'app-1');

    expect(result.status).toBe('queued');
    await flushBackgroundJobs();
    expect(runPrepareApplicationWorkflow).toHaveBeenCalled();
  });

  it('prepares from a PDF upload', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'PDF text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await expect(
      service.prepare(user, {
        file: {
          mimetype: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('pdf-content'),
        } as Express.Multer.File,
      }),
    ).resolves.toEqual({ applicationId: 'app-1', status: 'queued' });

    await flushBackgroundJobs();
    expect(runPrepareApplicationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'pdf', pdfBuffer: expect.any(Buffer) }),
    );
  });

  it('prepares from an image upload', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Image text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, {
      file: {
        mimetype: 'image/png',
        size: 512,
        buffer: Buffer.from('png-content'),
      } as Express.Multer.File,
    });
    await flushBackgroundJobs();

    expect(runPrepareApplicationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'image', imageMimeType: 'image/png' }),
    );
  });

  it('cancels a running application', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'running', user_id: 'u1' });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'failed' });

    const result = await service.cancel(user, 'app-1');

    expect(result.status).toBe('failed');
    expect(result.errors).toContain('Cancelled by user');
  });

  it('skips prepare finalization when cancelled during the workflow', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    let unblockWorkflow: () => void;
    const workflowGate = new Promise<void>((resolve) => {
      unblockWorkflow = resolve;
    });
    jest.mocked(runPrepareApplicationWorkflow).mockImplementation(async () => {
      await workflowGate;
      return {
        sourceCvId: 'cv-1',
        jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
        jobRawText: 'Job text',
        coverLetter: 'Letter',
        coverLetterEmailSubject: '',
        selectionRationale: '',
        tailorPatch: {},
        errors: [],
      };
    });
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        await service.cancel(user, 'app-1');
      }
      return { id: 'app-1', ...patch };
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();
    unblockWorkflow!();
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'running' });
    expect(repository.update).not.toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ status: 'ready' }),
    );
  });

  it('maps non-auth prepare failures to the raw error message', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockRejectedValue(new Error('Workflow timeout'));

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('marks update failed when tailored CV cannot be loaded', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    normalizedRepo.assembleFullResume.mockResolvedValue(null);

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
    expect(runUpdateApplicationWorkflow).not.toHaveBeenCalled();
  });

  it('rejects update when selected source CV is not owned', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });

    await service.updateApplication(user, 'app-1', { sourceCvId: 'missing-cv' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('maps auth failures during update to a friendly error', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });
    jest.mocked(runUpdateApplicationWorkflow).mockRejectedValue(new Error('403 forbidden'));

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('marks update failed when workflow returns errors', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });
    jest.mocked(runUpdateApplicationWorkflow).mockResolvedValue({
      sourceCvId: undefined,
      coverLetter: '',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: ['Update failed'],
    });

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(repository.update).toHaveBeenCalledWith(user, 'app-1', { status: 'failed' });
  });

  it('ignores missing clone removal during update cleanup', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValue(readyRow);
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      ...readyRow,
      ...patch,
    }));
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockRejectedValue(new NotFoundException('Clone missing'));
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });
    jest.mocked(runUpdateApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      coverLetter: 'Updated',
      coverLetterEmailSubject: 'Subject',
      selectionRationale: 'Rationale',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-2', sourceCvId: 'cv-1' });

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(runUpdateApplicationWorkflow).toHaveBeenCalled();
  });

  it('builds CV summaries from owned CVs during prepare', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([{ id: 'cv-1' }]);
    normalizedRepo.fetchHeader.mockResolvedValue(
      mockCvHeader({
        id: 'cv-1',
        name: 'Jane Doe',
        label: 'Engineer',
        summary: 'Backend specialist',
      }),
    );
    normalizedRepo.fetchSections.mockResolvedValue({
      profiles: [],
      work: [{ highlights: ['APIs', 'Scale'] }],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [{ name: 'TypeScript' }],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    });
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(runPrepareApplicationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        cvSummaries: [
          expect.objectContaining({
            id: 'cv-1',
            name: 'Jane Doe',
            skills: ['TypeScript'],
          }),
        ],
      }),
    );
  });

  it('resolves account display name from alternate metadata fields', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team,\n\n**[Your Name]**',
      source_cv_id: 'cv-1',
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: '   ' });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { display_name: 'Display Name' } } },
    });

    await expect(service.getCoverLetterMarkdown(user, 'app-1')).resolves.toContain('Display Name');
  });

  it('scopes provider API keys during prepare when catalog defines an env var', async () => {
    const envVar = testCatalog.providers.find((provider) =>
      provider.models.some((model) => model.id === 'openai/gpt-4o-mini'),
    )!.apiKeyEnvVar;
    const previous = process.env[envVar];
    delete process.env[envVar];

    try {
      repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
      cvService.findAll.mockResolvedValue([]);
      jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
        sourceCvId: 'cv-1',
        jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
        jobRawText: 'Job text',
        coverLetter: 'Letter',
        coverLetterEmailSubject: '',
        selectionRationale: '',
        tailorPatch: {},
        errors: [],
      });
      cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

      await service.prepare(user, { text: 'Job text' });
      await flushBackgroundJobs();

      expect(process.env[envVar]).toBeUndefined();

      process.env[envVar] = 'existing-key';
      await service.prepare(user, { text: 'Another job' });
      await flushBackgroundJobs();

      expect(process.env[envVar]).toBe('existing-key');
    } finally {
      if (previous === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = previous;
      }
    }
  });

  it('runs prepare without env scoping when model is absent from catalog', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'unknown/model',
      apiKey: 'key',
      accountId: 'acc',
    });
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(runPrepareApplicationWorkflow).toHaveBeenCalled();
  });

  it('aborts prepare job when cancelled before it starts', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'queued' });

    await service.prepare(user, { text: 'Job text' });
    await service.cancel(user, 'app-1');
    await flushBackgroundJobs();

    expect(runPrepareApplicationWorkflow).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalledWith(user, 'app-1', { status: 'running' });
  });

  it('ignores prepare progress updates after cancellation', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    let applicationStatus: 'queued' | 'running' | 'failed' = 'queued';
    repository.findOne.mockImplementation(async () => ({
      id: 'app-1',
      status: applicationStatus,
    }));
    jest.mocked(runPrepareApplicationWorkflow).mockImplementation(async ({ onProgress }) => {
      onProgress?.('selecting_cv');
      return {
        sourceCvId: 'cv-1',
        jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
        jobRawText: 'Job text',
        coverLetter: 'Letter',
        coverLetterEmailSubject: '',
        selectionRationale: '',
        tailorPatch: {},
        errors: [],
      };
    });
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        applicationStatus = 'running';
        await service.cancel(user, 'app-1');
        applicationStatus = 'failed';
      }
      return { id: 'app-1', status: patch.status ?? applicationStatus, ...patch };
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(repository.update).not.toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ status: 'ready' }),
    );
  });

  it('cleans up cloned CV when prepare is cancelled after tailoring', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    let applicationStatus: 'queued' | 'running' | 'failed' = 'queued';
    repository.findOne.mockImplementation(async () => ({
      id: 'app-1',
      status: applicationStatus,
    }));
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        applicationStatus = 'running';
      }
      if (patch.status === 'failed') {
        applicationStatus = 'failed';
      }
      return { id: 'app-1', status: patch.status ?? applicationStatus, ...patch };
    });
    cvCloneService.deepClone.mockImplementation(async () => {
      applicationStatus = 'running';
      await service.cancel(user, 'app-1');
      applicationStatus = 'failed';
      return { id: 'clone-1', sourceCvId: 'cv-1' };
    });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(cvService.remove).toHaveBeenCalledWith(user, 'clone-1');
  });

  it('aborts update job when application row disappears before processing', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    repository.findOne.mockResolvedValueOnce(readyRow).mockResolvedValueOnce(null);

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(runUpdateApplicationWorkflow).not.toHaveBeenCalled();
  });

  it('cleans up cloned CV when update is cancelled after tailoring', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    let applicationStatus: 'ready' | 'queued' | 'running' | 'failed' = 'ready';
    repository.findOne.mockImplementation(async () => ({
      ...readyRow,
      status: applicationStatus,
      tailored_cv_id: applicationStatus === 'ready' ? 'clone-1' : readyRow.tailored_cv_id,
    }));
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        applicationStatus = 'running';
      }
      if (patch.status === 'failed') {
        applicationStatus = 'failed';
      }
      return { ...readyRow, ...patch, status: patch.status ?? applicationStatus };
    });
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });
    jest.mocked(runUpdateApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      coverLetter: 'Updated',
      coverLetterEmailSubject: 'Subject',
      selectionRationale: 'Rationale',
      tailorPatch: {},
      errors: [],
    });
    cvCloneService.deepClone.mockImplementation(async () => {
      applicationStatus = 'running';
      await service.cancel(user, 'app-1');
      applicationStatus = 'failed';
      return { id: 'clone-2', sourceCvId: 'cv-1' };
    });

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(cvService.remove).toHaveBeenCalledWith(user, 'clone-2');
  });

  it('ignores missing clone cleanup errors when prepare is cancelled after tailoring', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    let applicationStatus: 'queued' | 'running' | 'failed' = 'queued';
    repository.findOne.mockImplementation(async () => ({
      id: 'app-1',
      status: applicationStatus,
    }));
    jest.mocked(runPrepareApplicationWorkflow).mockResolvedValue({
      sourceCvId: 'cv-1',
      jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
      jobRawText: 'Job text',
      coverLetter: 'Letter',
      coverLetterEmailSubject: '',
      selectionRationale: '',
      tailorPatch: {},
      errors: [],
    });
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        applicationStatus = 'running';
      }
      if (patch.status === 'failed') {
        applicationStatus = 'failed';
      }
      return { id: 'app-1', status: patch.status ?? applicationStatus, ...patch };
    });
    cvCloneService.deepClone.mockImplementation(async () => {
      applicationStatus = 'running';
      await service.cancel(user, 'app-1');
      applicationStatus = 'failed';
      return { id: 'clone-1', sourceCvId: 'cv-1' };
    });
    cvService.remove.mockRejectedValue(new NotFoundException('Clone already deleted'));

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(cvService.remove).toHaveBeenCalledWith(user, 'clone-1');
  });

  it('stops prepare progress callbacks after cancellation', async () => {
    repository.create.mockResolvedValue({ id: 'app-1', status: 'queued' });
    cvService.findAll.mockResolvedValue([]);
    let applicationStatus: 'queued' | 'running' | 'failed' = 'queued';
    repository.findOne.mockImplementation(async () => ({
      id: 'app-1',
      status: applicationStatus,
    }));
    jest.mocked(runPrepareApplicationWorkflow).mockImplementation(async ({ onProgress }) => {
      onProgress?.('selecting_cv');
      applicationStatus = 'running';
      await service.cancel(user, 'app-1');
      applicationStatus = 'failed';
      onProgress?.('tailoring');
      return {
        sourceCvId: 'cv-1',
        jobSummary: { title: 'Engineer', company: 'Acme', requirements: [], keywords: [] },
        jobRawText: 'Job text',
        coverLetter: 'Letter',
        coverLetterEmailSubject: '',
        selectionRationale: '',
        tailorPatch: {},
        errors: [],
      };
    });
    repository.update.mockImplementation(async (_user, _id, patch) => ({
      id: 'app-1',
      status: patch.status ?? applicationStatus,
      ...patch,
    }));
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-1', sourceCvId: 'cv-1' });

    await service.prepare(user, { text: 'Job text' });
    await flushBackgroundJobs();

    expect(repository.update).not.toHaveBeenCalledWith(
      user,
      'app-1',
      expect.objectContaining({ status: 'ready' }),
    );
  });

  it('aborts update retry when cancelled before the job starts', async () => {
    const failedRow = {
      id: 'app-1',
      status: 'failed',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      job_title: 'Engineer',
      job_company: 'Acme',
      cover_letter: 'Old letter',
    };
    let applicationStatus: 'failed' | 'queued' | 'running' = 'failed';
    repository.findOne.mockImplementation(async () => ({
      ...failedRow,
      status: applicationStatus,
    }));
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'queued') {
        applicationStatus = 'queued';
      }
      return { ...failedRow, status: applicationStatus, ...patch };
    });

    const result = await service.retry(user, 'app-1');
    await service.cancel(user, 'app-1');
    await flushBackgroundJobs();

    expect(result.status).toBe('queued');
    expect(runUpdateApplicationWorkflow).not.toHaveBeenCalled();
  });

  it('skips update finalization when cancelled after the workflow completes', async () => {
    const readyRow = {
      id: 'app-1',
      status: 'ready',
      job_raw_text: 'Job text',
      tailored_cv_id: 'clone-1',
      cover_letter: 'Old letter',
      job_title: 'Engineer',
      job_company: 'Acme',
    };
    let applicationStatus: 'ready' | 'queued' | 'running' | 'failed' = 'ready';
    repository.findOne.mockImplementation(async () => ({
      ...readyRow,
      status: applicationStatus,
      tailored_cv_id: applicationStatus === 'ready' ? 'clone-1' : readyRow.tailored_cv_id,
    }));
    repository.update.mockImplementation(async (_user, _id, patch) => {
      if (patch.status === 'running') {
        applicationStatus = 'running';
      }
      if (patch.status === 'failed') {
        applicationStatus = 'failed';
      }
      return { ...readyRow, ...patch, status: patch.status ?? applicationStatus };
    });
    cvService.findAll.mockResolvedValue([]);
    cvService.remove.mockResolvedValue(undefined);
    normalizedRepo.assembleFullResume.mockResolvedValue({
      basics: { name: 'Jane Doe' },
      work: [],
      skills: [],
    });
    jest.mocked(runUpdateApplicationWorkflow).mockImplementation(async () => {
      applicationStatus = 'running';
      await service.cancel(user, 'app-1');
      applicationStatus = 'failed';
      return {
        sourceCvId: 'cv-1',
        coverLetter: 'Updated',
        coverLetterEmailSubject: 'Subject',
        selectionRationale: 'Rationale',
        tailorPatch: {},
        errors: [],
      };
    });
    cvCloneService.deepClone.mockResolvedValue({ id: 'clone-2', sourceCvId: 'cv-1' });

    await service.updateApplication(user, 'app-1', { message: 'Refresh summary' });
    await flushBackgroundJobs();

    expect(cvCloneService.deepClone).not.toHaveBeenCalled();
  });
});
