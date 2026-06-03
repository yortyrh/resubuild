import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.types';
import type { CvService } from '../cv/cv.service';
import type { CvNormalizedRepository } from '../cv/cv-normalized.repository';
import type { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvJsonResumeSwapService } from './cv-json-resume-swap.service';

const user = { id: 'user-1', accessToken: 'tok', authMethod: 'jwt' as const } as AuthUser;

const mockCvService = {
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockNormalizedRepo = {
  createClientForUser: jest.fn(),
  fetchHeader: jest.fn(),
  insertNormalizedCv: jest.fn(),
};

const mockSchemaValidator = {
  validate: jest.fn(),
};

function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };
}

describe('CvJsonResumeSwapService', () => {
  let service: CvJsonResumeSwapService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = createMockSupabaseClient();
    mockNormalizedRepo.createClientForUser.mockReturnValue(mockSupabase as never);

    service = new CvJsonResumeSwapService(
      mockCvService as unknown as CvService,
      mockNormalizedRepo as unknown as CvNormalizedRepository,
      mockSchemaValidator as unknown as ResumeSchemaValidator,
    );
  });

  describe('createFromJsonResume', () => {
    it('creates a CV from JSON Resume document', async () => {
      const document = { basics: { name: 'John' } };
      const prepared = { basics: { name: 'John' }, work: [] };
      mockCvService.create.mockResolvedValue({ id: 'cv-new', ...prepared } as never);

      (service as unknown as { prepare: (doc: unknown) => Record<string, unknown> }).prepare = jest
        .fn()
        .mockReturnValue(prepared);

      const result = await service.createFromJsonResume(user, document);

      expect(mockCvService.create).toHaveBeenCalledWith(user, { data: prepared });
      expect(result).toEqual({ id: 'cv-new', ...prepared });
    });

    it('throws BadRequestException when prepare fails', async () => {
      (service as unknown as { prepare: (doc: unknown) => Record<string, unknown> }).prepare = jest
        .fn()
        .mockImplementation(() => {
          throw new BadRequestException('Invalid document');
        });

      await expect(service.createFromJsonResume(user, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('replaceFromJsonResume', () => {
    const cvId = '11111111-1111-1111-1111-111111111111';

    it('throws NotFoundException when CV does not exist', async () => {
      mockNormalizedRepo.fetchHeader.mockResolvedValue(null);

      await expect(service.replaceFromJsonResume(user, cvId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when CV is not primary', async () => {
      mockNormalizedRepo.fetchHeader.mockResolvedValue({ kind: 'application_clone' } as never);

      await expect(service.replaceFromJsonResume(user, cvId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when staging insert fails', async () => {
      (service as unknown as { prepare: (doc: unknown) => Record<string, unknown> }).prepare = jest
        .fn()
        .mockReturnValue({ basics: {} });
      mockNormalizedRepo.fetchHeader.mockResolvedValue({ kind: 'primary' } as never);
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

      await expect(service.replaceFromJsonResume(user, cvId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rolls back staging row when insertNormalizedCv fails', async () => {
      const prepared = { basics: { name: 'Dave' } };
      (service as unknown as { prepare: (doc: unknown) => Record<string, unknown> }).prepare = jest
        .fn()
        .mockReturnValue(prepared);
      mockNormalizedRepo.fetchHeader.mockResolvedValue({ kind: 'primary' } as never);

      mockSupabase.single.mockResolvedValue({ data: { id: 'staging-id' }, error: null });
      mockNormalizedRepo.insertNormalizedCv.mockRejectedValue(new Error('DB error'));

      await expect(service.replaceFromJsonResume(user, cvId, {})).rejects.toThrow('DB error');
    });

    it('rolls back staging CV when promote update fails', async () => {
      const prepared = { basics: { name: 'Updated' } };
      (service as unknown as { prepare: (doc: unknown) => Record<string, unknown> }).prepare = jest
        .fn()
        .mockReturnValue(prepared);
      mockNormalizedRepo.fetchHeader.mockResolvedValue({ kind: 'primary' } as never);

      // First single() returns staging-id (insert succeeded)
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'staging-id' }, error: null });

      // insertNormalizedCv succeeds
      mockNormalizedRepo.insertNormalizedCv.mockResolvedValue(undefined);

      // Mock for the update (promote to primary) - error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      // Mock for the catch block delete of staging row
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      await expect(
        service.replaceFromJsonResume(user, cvId, { basics: { name: 'Updated' } }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
