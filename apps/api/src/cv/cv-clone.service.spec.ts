import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Resume } from '@resumind/types';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvCloneService, CvSourceLoaderService } from './cv-clone.service';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { createMockNormalizedRepo, mockCvHeader } from './cv-test.helpers';

describe('CvCloneService', () => {
  let service: CvCloneService;
  let normalizedRepo: ReturnType<typeof createMockNormalizedRepo>;
  let validator: jest.Mocked<Pick<ResumeSchemaValidator, 'validate'>>;

  const user = { id: 'user-1', accessToken: 'token' } as never;
  const supabase = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    normalizedRepo = createMockNormalizedRepo();
    normalizedRepo.createClientForUser.mockReturnValue(supabase as never);

    validator = { validate: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CvCloneService,
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
        { provide: ResumeSchemaValidator, useValue: validator },
      ],
    }).compile();

    service = module.get(CvCloneService);
  });

  it('deep clones source CV as application clone', async () => {
    const sourceHeader = mockCvHeader({ id: 'source-1' });
    const resume = { basics: { name: 'Jane' }, work: [] } as Resume;

    normalizedRepo.fetchHeader.mockResolvedValue(sourceHeader);
    normalizedRepo.assembleFullResume.mockResolvedValueOnce(resume).mockResolvedValueOnce(resume);

    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'clone-1' }, error: null }),
    };
    supabase.from.mockReturnValue(insertChain);

    normalizedRepo.insertNormalizedCv.mockResolvedValue(mockCvHeader({ id: 'clone-1' }));

    const result = await service.deepClone(user, 'source-1');

    expect(result).toEqual({ id: 'clone-1', sourceCvId: 'source-1' });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_cv_id: 'source-1',
        kind: 'application_clone',
      }),
    );
    expect(validator.validate).toHaveBeenCalled();
  });

  it('throws when source CV is missing', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);

    await expect(service.deepClone(user, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('promotes application clone by cloning as primary', async () => {
    const sourceHeader = mockCvHeader({ id: 'clone-1', kind: 'application_clone' });
    const resume = { basics: { name: 'Jane' }, work: [] } as Resume;

    normalizedRepo.fetchHeader.mockResolvedValue(sourceHeader);
    normalizedRepo.assembleFullResume.mockResolvedValueOnce(resume).mockResolvedValueOnce(resume);

    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'promoted-1' }, error: null }),
    };
    supabase.from.mockReturnValue(insertChain);
    normalizedRepo.insertNormalizedCv.mockResolvedValue(mockCvHeader({ id: 'promoted-1' }));

    const result = await service.promoteClone(user, 'clone-1');

    expect(result).toEqual({ id: 'promoted-1', sourceCvId: 'clone-1' });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_cv_id: 'clone-1',
        kind: 'primary',
      }),
    );
  });

  it('rejects promoting non-clone CVs', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader({ id: 'cv-1', kind: 'primary' }));

    await expect(service.promoteClone(user, 'cv-1')).rejects.toThrow(BadRequestException);
  });
});

describe('CvSourceLoaderService', () => {
  it('loads work items from source CV', async () => {
    const normalizedRepo = createMockNormalizedRepo();
    normalizedRepo.listSectionRows.mockResolvedValue([{ id: 'w1' }]);
    const service = new CvSourceLoaderService(normalizedRepo as never);
    const user = { accessToken: 'tok' } as never;

    await expect(service.loadWorkItems(user, 'source-1')).resolves.toEqual([{ id: 'w1' }]);
    expect(normalizedRepo.listSectionRows).toHaveBeenCalledWith(
      expect.anything(),
      'source-1',
      'work',
    );
  });
});
