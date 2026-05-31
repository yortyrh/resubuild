import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AiAgentCredentialService } from '../ai-agent/ai-agent-credential.service';
import { CvService } from '../cv/cv.service';
import { CvCloneService } from '../cv/cv-clone.service';
import { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import { ImportModelsCatalogService } from '../import-models-catalog/import-models-catalog.service';
import { ApplicationRepository } from './application.repository';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
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
    getCatalog: jest.fn().mockReturnValue({ providers: [] }),
  };
  const normalizedRepo = {
    createClientForUser: jest.fn(),
    fetchHeader: jest.fn(),
    assembleFullResume: jest.fn(),
    replaceNormalizedCv: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    normalizedRepo.createClientForUser.mockReturnValue({});
    normalizedRepo.fetchHeader.mockResolvedValue(null);
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
        {
          provide: CvService,
          useValue: { findAll: jest.fn().mockResolvedValue([]), remove: jest.fn() },
        },
        { provide: CvCloneService, useValue: { deepClone: jest.fn(), promoteClone: jest.fn() } },
      ],
    }).compile();

    service = module.get(ApplicationService);
  });

  it('requires active AI agent account for prepare', async () => {
    aiAgentCredentialService.getActiveCredentials.mockRejectedValue(
      new ForbiddenException('Active AI agent configuration is required'),
    );

    await expect(
      service.prepare({ id: 'u1', accessToken: 'tok' } as never, { text: 'Job posting text here' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects oversize files', async () => {
    aiAgentCredentialService.getActiveCredentials.mockResolvedValue({
      modelId: 'openai/gpt-4o-mini',
      apiKey: 'key',
      accountId: 'acc',
    });

    await expect(
      service.prepare({ id: 'u1', accessToken: 'tok' } as never, {
        file: {
          mimetype: 'application/pdf',
          size: 6 * 1024 * 1024,
          buffer: Buffer.from('pdf'),
        } as Express.Multer.File,
      }),
    ).rejects.toThrow(/maximum size/i);
  });

  it('removes application and tailored clone', async () => {
    const cvService = {
      findAll: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
    };
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
        { provide: CvCloneService, useValue: { deepClone: jest.fn(), promoteClone: jest.fn() } },
      ],
    }).compile();
    const removeService = module.get(ApplicationService);

    repository.findOne.mockResolvedValue({ id: 'app-1', tailored_cv_id: 'clone-1' });
    repository.remove.mockResolvedValue(true);

    await removeService.remove({ id: 'u1', accessToken: 'tok' } as never, 'app-1');

    expect(repository.remove).toHaveBeenCalledWith({ id: 'u1', accessToken: 'tok' }, 'app-1');
    expect(cvService.remove).toHaveBeenCalledWith({ id: 'u1', accessToken: 'tok' }, 'clone-1');
  });

  it('cancels a queued application', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'queued', user_id: 'u1' });
    repository.update.mockResolvedValue({ id: 'app-1', status: 'failed' });

    const result = await service.cancel({ id: 'u1', accessToken: 'tok' } as never, 'app-1');

    expect(repository.update).toHaveBeenCalledWith({ id: 'u1', accessToken: 'tok' }, 'app-1', {
      status: 'failed',
    });
    expect(result.status).toBe('failed');
    expect(result.errors).toContain('Cancelled by user');
  });

  it('rejects cancel when application is ready', async () => {
    repository.findOne.mockResolvedValue({ id: 'app-1', status: 'ready' });

    await expect(
      service.cancel({ id: 'u1', accessToken: 'tok' } as never, 'app-1'),
    ).rejects.toThrow(BadRequestException);
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

    await service.applyTailorPatch({ id: 'u1', accessToken: 'tok' } as never, 'clone-1', {});

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalledWith({}, 'clone-1', {
      basics: {
        name: 'Thomas Davis',
        summary: 'Full stack developer - generative AI',
      },
      work: [{ summary: 'Led teams - shipped features', highlights: ['APIs - scale'] }],
    });
  });

  it('builds cover letter PDF filename from company, candidate name, and job title', async () => {
    repository.findOne.mockResolvedValue({
      id: 'app-1',
      cover_letter: 'Dear team',
      job_company: 'Acme Corp',
      job_title: 'Engineering Manager',
      source_cv_id: 'cv-1',
    });
    normalizedRepo.fetchHeader.mockResolvedValue({ name: 'Thomas Davis' });

    const result = await service.getCoverLetterPdfExport(
      { id: 'u1', accessToken: 'tok' } as never,
      'app-1',
    );

    expect(result.markdown).toBe('Dear team');
    expect(result.filename).toBe('acme-corp-thomas-davis-engineering-manager.pdf');
  });
});
