import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDefaultPresentationConfig } from '@resumind/resume-template';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { CvTemplatePresentationRepository } from './cv-template-presentation.repository';
import { CvTemplatePresentationService } from './cv-template-presentation.service';
import { createMockNormalizedRepo, mockCvHeader } from './cv-test.helpers';

describe('CvTemplatePresentationService', () => {
  let service: CvTemplatePresentationService;
  let normalizedRepo: ReturnType<typeof createMockNormalizedRepo>;
  let presentationRepo: {
    fetch: jest.Mock;
    upsert: jest.Mock;
  };
  const supabaseStub = {};
  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'jwt' };

  beforeEach(async () => {
    normalizedRepo = createMockNormalizedRepo();
    normalizedRepo.createClientForUser.mockReturnValue(supabaseStub as never);
    presentationRepo = {
      fetch: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvTemplatePresentationService,
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: CvTemplatePresentationRepository, useValue: presentationRepo },
      ],
    }).compile();

    service = module.get(CvTemplatePresentationService);
  });

  it('returns defaults when no row exists', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader());

    const result = await service.getPresentation(user, 'cv-1', 'classic');

    expect(result.templateId).toBe('classic');
    expect(result.config).toEqual(getDefaultPresentationConfig('classic'));
  });

  it('merges stored config on get', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader());
    presentationRepo.fetch.mockResolvedValue({
      config: { hiddenSections: ['projects'] },
    });

    const result = await service.getPresentation(user, 'cv-1', 'modern');

    expect(result.templateId).toBe('modern');
    expect(result.config.hiddenSections).toContain('projects');
  });

  it('throws when CV is missing', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);

    await expect(service.getPresentation(user, 'cv-1', 'classic')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when upserting presentation for missing CV', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);

    await expect(
      service.upsertPresentation(user, 'cv-1', 'classic', { hiddenSections: ['work'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects unknown template ids', async () => {
    await expect(service.getPresentation(user, 'cv-1', 'not-a-real-template')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('upserts merged presentation config', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader());

    const result = await service.upsertPresentation(user, 'cv-1', 'tabular', {
      hiddenSections: ['interests'],
    });

    expect(result.templateId).toBe('tabular');
    expect(result.config.hiddenSections).toContain('interests');
    expect(presentationRepo.upsert).toHaveBeenCalledWith(
      supabaseStub,
      'cv-1',
      'tabular',
      expect.objectContaining({ hiddenSections: ['interests'] }),
    );
  });

  it('loads presentation for export without requiring header', async () => {
    presentationRepo.fetch.mockResolvedValue({
      config: { leadershipVolunteer: true },
    });

    const config = await service.loadPresentationForExport(user, 'cv-1', 'left');

    expect(config.leadershipVolunteer).toBe(true);
    expect(normalizedRepo.fetchHeader).not.toHaveBeenCalled();
  });

  it('merges existing row on upsert', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader());
    presentationRepo.fetch.mockResolvedValue({
      config: { hiddenSections: ['awards'] },
    });

    const result = await service.upsertPresentation(user, 'cv-1', 'classic', {
      hiddenSections: ['projects'],
    });

    expect(result.config.hiddenSections).toEqual(['projects']);
  });

  it('resolves legacy template ids to canonical ids', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader());

    const result = await service.getPresentation(user, 'cv-1', 'mit-classic');

    expect(result.templateId).toBe('classic');
  });

  it('exposes schema defaults', () => {
    expect(service.getSchemaDefaults().sectionOrder.length).toBeGreaterThan(0);
  });
});
