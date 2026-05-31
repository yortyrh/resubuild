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
    normalizedRepo.fetchSections.mockResolvedValue({});
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'key',
      accountId: 'acc',
    });

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
});
