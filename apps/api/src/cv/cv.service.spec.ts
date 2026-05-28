/**
 * Scenarios referenced from openspec/specs/cv-rest-api (CRUD, baseline create flow).
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvService } from './cv.service';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { createMockNormalizedRepo, mockCvHeader } from './cv-test.helpers';

describe('CvService', () => {
  let service: CvService;
  let normalizedRepo: ReturnType<typeof createMockNormalizedRepo>;
  const supabaseStub = {};

  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'jwt-access-token' };

  beforeEach(async () => {
    normalizedRepo = createMockNormalizedRepo();
    normalizedRepo.createClientForUser.mockReturnValue(supabaseStub as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvService,
        ResumeSchemaValidator,
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
      ],
    }).compile();

    service = module.get(CvService);
  });

  it('throws when SUPABASE credentials are incomplete', async () => {
    normalizedRepo.createClientForUser.mockImplementation(() => {
      throw new Error('Supabase is not configured');
    });

    await expect(service.findAll(user)).rejects.toThrow('Supabase is not configured');
  });

  describe('findAll', () => {
    it('throws BadRequestException when list query fails', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'list fail' } }),
        })),
      }));

      await expect(service.findAll(user)).rejects.toThrow(BadRequestException);
    });

    it('returns slim CV records ordered by updated_at', async () => {
      const header = mockCvHeader({ id: 'a', name: 'Jane', label: 'Engineer' });
      const order = jest.fn().mockResolvedValue({ data: [header], error: null });

      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        select: jest.fn(() => ({ order })),
      }));

      const result = await service.findAll(user);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Jane — Engineer');
      expect((result[0].data as { basics?: { name?: string } }).basics?.name).toBe('Jane');
      expect(result[0].data).not.toHaveProperty('meta');
      expect(result[0].data).not.toHaveProperty('work');
      expect(normalizedRepo.fetchSections).not.toHaveBeenCalled();
    });
  });

  it('getHeader throws NotFoundException when CV is missing', async () => {
    normalizedRepo.fetchHeader.mockResolvedValue(null);
    await expect(service.getHeader(user, 'gone')).rejects.toThrow(NotFoundException);
  });

  describe('findOne', () => {
    it('throws NotFoundException when CV is missing', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(null);

      await expect(service.findOne(user, 'gone')).rejects.toThrow(NotFoundException);
    });

    it('returns slim data from header row only', async () => {
      const header = mockCvHeader({ name: 'Jane Doe', label: 'Engineer' });
      normalizedRepo.fetchHeader.mockResolvedValue(header);

      const result = await service.findOne(user, 'cv-1');

      expect(result.title).toBe('Jane Doe — Engineer');
      expect((result.data as { basics?: { name?: string } }).basics?.name).toBe('Jane Doe');
      expect(result.data).not.toHaveProperty('meta');
      expect(result.data).not.toHaveProperty('work');
      expect(normalizedRepo.fetchSections).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('inserts cv row and normalized sections', async () => {
      const insertedHeader = mockCvHeader({ id: 'fresh-id' });
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: insertedHeader, error: null }),
          })),
        })),
      }));

      normalizedRepo.insertNormalizedCv.mockResolvedValue(
        mockCvHeader({
          id: 'fresh-id',
          name: 'Jane Doe',
          label: 'Engineer',
        }),
      );

      const result = await service.create(user, {
        data: { basics: { name: 'Jane Doe', label: 'Engineer' } },
      });

      expect(normalizedRepo.insertNormalizedCv).toHaveBeenCalled();
      expect(result.title).toBe('Jane Doe — Engineer');
      expect(result.data).not.toHaveProperty('meta');
    });

    it('throws BadRequestException when insert fails', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'insert fail' } }),
          })),
        })),
      }));

      await expect(service.create(user, { data: { basics: { name: 'Jane' } } })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid resume JSON', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockCvHeader({ id: 'x' }), error: null }),
          })),
        })),
      }));

      await expect(
        service.create(user, { data: { work: [{ name: 123 as unknown as string }] } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates before insert so invalid data does not create a cv row', async () => {
      const insert = jest.fn();
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        insert,
      }));

      await expect(
        service.create(user, { data: { work: [{ name: 123 as unknown as string }] } }),
      ).rejects.toThrow(BadRequestException);

      expect(insert).not.toHaveBeenCalled();
    });

    it('persists multi-section imported data via normalized insert', async () => {
      const insertedHeader = mockCvHeader({ id: 'import-id' });
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: insertedHeader, error: null }),
          })),
        })),
      }));

      normalizedRepo.insertNormalizedCv.mockResolvedValue(
        mockCvHeader({
          id: 'import-id',
          name: 'Jane Doe',
          label: 'Senior Software Engineer',
        }),
      );

      const importedData = {
        basics: { name: 'Jane Doe', label: 'Senior Software Engineer' },
        work: [
          {
            name: 'Tech Innovators Inc.',
            position: 'Lead Full Stack Developer',
            startDate: '2021-06-15',
          },
        ],
        education: [
          {
            institution: 'University of Toronto',
            area: 'Computer Science',
            studyType: 'Bachelor of Science',
          },
        ],
        meta: { canonical: 'https://example.org/old', version: 'v4.99.99' },
      };

      const result = await service.create(user, { data: importedData });

      expect(normalizedRepo.insertNormalizedCv).toHaveBeenCalledWith(
        supabaseStub,
        'import-id',
        user.id,
        expect.objectContaining({
          basics: expect.objectContaining({ name: 'Jane Doe' }),
          work: expect.arrayContaining([expect.objectContaining({ name: 'Tech Innovators Inc.' })]),
          education: expect.arrayContaining([
            expect.objectContaining({ institution: 'University of Toronto' }),
          ]),
        }),
      );
      expect(result.title).toBe('Jane Doe — Senior Software Engineer');
      expect(result.data).not.toHaveProperty('meta');
      expect(result.data).not.toHaveProperty('work');
    });
  });

  describe('update', () => {
    it('ignores title-only updates and returns slim CV', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader({ name: 'Jane' }));

      const result = await service.update(user, 'cv-1', { title: 'Ignored' });
      expect(result.title).toBe('Jane');
      expect(normalizedRepo.replaceNormalizedCv).not.toHaveBeenCalled();
      expect(normalizedRepo.fetchSections).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when header is missing after data update', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(null);

      await expect(
        service.update(user, 'cv-1', { data: { basics: { name: 'Updated' } } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('replaces normalized rows when data is provided', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(
        mockCvHeader({ name: 'Updated', label: 'Role' }),
      );
      normalizedRepo.replaceNormalizedCv.mockResolvedValue(
        mockCvHeader({ name: 'Updated', label: 'Role' }),
      );

      const result = await service.update(user, 'cv-1', {
        data: { basics: { name: 'Updated', label: 'Role' } },
      });

      expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalled();
      expect(result.title).toBe('Updated — Role');
    });

    it('persists valid templateId', async () => {
      const update = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }));
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({ update }));
      normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader({ template_id: 'capd-alum' }));

      const result = await service.update(user, 'cv-1', { templateId: 'capd-alum' });

      expect(update).toHaveBeenCalledWith({ template_id: 'capd-alum' });
      expect(result.templateId).toBe('capd-alum');
    });

    it('rejects unknown templateId with BadRequestException', async () => {
      await expect(
        service.update(user, 'cv-1', { templateId: 'not-a-real-template' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('persistValidatedData validates and replaces normalized cv', async () => {
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(mockCvHeader({ name: 'Import' }));

    const result = await service.persistValidatedData(user, 'cv-1', {
      basics: { name: 'Import' },
    });

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalled();
    expect(result.title).toBe('Import');
    expect(normalizedRepo.fetchSections).not.toHaveBeenCalled();
  });

  describe('remove', () => {
    it('deletes cv row', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'cv-1' }, error: null }),
            })),
          })),
        })),
      }));

      await expect(service.remove(user, 'cv-1')).resolves.toBeUndefined();
    });

    it('throws BadRequestException when delete fails', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'delete fail' } }),
            })),
          })),
        })),
      }));

      await expect(service.remove(user, 'cv-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when delete returns no row', async () => {
      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      }));

      await expect(service.remove(user, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
