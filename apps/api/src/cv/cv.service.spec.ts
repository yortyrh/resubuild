/**
 * Scenarios referenced from openspec/specs/cv-rest-api (CRUD, 409 concurrency, baseline create flow).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'SUPABASE_URL':
                  return 'https://supa.test';
                case 'SUPABASE_ANON_KEY':
                  return 'anon-key';
                case 'APP_URL':
                  return 'http://app.test.example';
                default:
                  return undefined;
              }
            },
          },
        },
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

    it('returns assembled CV records ordered by updated_at', async () => {
      const header = mockCvHeader({ id: 'a', name: 'Jane', label: 'Engineer' });
      const order = jest.fn().mockResolvedValue({ data: [header], error: null });

      (supabaseStub as { from: jest.Mock }).from = jest.fn(() => ({
        select: jest.fn(() => ({ order })),
      }));

      const result = await service.findAll(user);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Jane — Engineer');
      expect((result[0].data as { basics?: { name?: string } }).basics?.name).toBe('Jane');
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

    it('assembles full resume from normalized rows', async () => {
      const header = mockCvHeader({ name: 'Jane Doe', label: 'Engineer' });
      normalizedRepo.fetchHeader.mockResolvedValue(header);
      normalizedRepo.fetchSections.mockResolvedValue({
        profiles: [],
        work: [
          {
            id: 'w1',
            cv_id: 'cv-1',
            name: 'Acme',
            start_date: '2020-01',
            highlights: [],
          },
        ],
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

      const result = await service.findOne(user, 'cv-1');

      expect(result.title).toBe('Jane Doe — Engineer');
      expect(result.data.work).toEqual([{ name: 'Acme', startDate: '2020-01' }]);
    });
  });

  describe('create', () => {
    it('inserts cv row and normalized sections with meta', async () => {
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
          meta_version: 'v1.0.0',
          meta_canonical: 'http://app.test.example/dashboard/cv/fresh-id',
        }),
      );

      const result = await service.create(user, {
        data: { basics: { name: 'Jane Doe', label: 'Engineer' } },
      });

      expect(normalizedRepo.insertNormalizedCv).toHaveBeenCalled();
      expect(result.title).toBe('Jane Doe — Engineer');
      expect((result.data as { meta?: { version?: string } }).meta?.version).toBe('v1.0.0');
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
  });

  describe('update', () => {
    it('throws ConflictException on stale version', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader({ meta_version: 'v2.0.0' }));

      await expect(
        service.update(user, 'cv-1', {
          data: { meta: { version: 'v1.0.0' }, basics: { name: 'Jane' } },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ignores title-only updates and returns assembled CV', async () => {
      normalizedRepo.fetchHeader.mockResolvedValue(mockCvHeader({ name: 'Jane' }));
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

      const result = await service.update(user, 'cv-1', { title: 'Ignored' });
      expect(result.title).toBe('Jane');
      expect(normalizedRepo.replaceNormalizedCv).not.toHaveBeenCalled();
    });

    it('replaces normalized rows when data is provided', async () => {
      normalizedRepo.fetchHeader
        .mockResolvedValueOnce(mockCvHeader())
        .mockResolvedValueOnce(mockCvHeader({ name: 'Updated', label: 'Role' }));
      normalizedRepo.replaceNormalizedCv.mockResolvedValue(
        mockCvHeader({ name: 'Updated', label: 'Role' }),
      );

      const result = await service.update(user, 'cv-1', {
        data: { basics: { name: 'Updated', label: 'Role' }, meta: { version: 'v1.0.0' } },
      });

      expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalled();
      expect(result.title).toBe('Updated — Role');
    });
  });

  it('persistValidatedData validates and replaces normalized cv', async () => {
    normalizedRepo.replaceNormalizedCv.mockResolvedValue(mockCvHeader({ name: 'Import' }));
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

    const result = await service.persistValidatedData(user, 'cv-1', {
      basics: { name: 'Import' },
    });

    expect(normalizedRepo.replaceNormalizedCv).toHaveBeenCalled();
    expect(result.title).toBe('Import');
  });

  it('bumpVersion delegates to normalized repository', async () => {
    normalizedRepo.bumpMetaVersion.mockResolvedValue('v1.0.2');

    const version = await service.bumpVersion(supabaseStub as never, 'cv-1', 'v1.0.1', 'v1.0.1');

    expect(version).toBe('v1.0.2');
    expect(normalizedRepo.bumpMetaVersion).toHaveBeenCalled();
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
