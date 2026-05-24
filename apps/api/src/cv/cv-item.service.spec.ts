/**
 * Scenarios referenced from openspec/changes/cv-granular-item-management (item CRUD, 409, 404).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CvItemService } from './cv-item.service';
import { CvRecord, CvService } from './cv.service';

describe('CvItemService', () => {
  let service: CvItemService;
  let cvService: jest.Mocked<Pick<CvService, 'findOne' | 'persistValidatedData'>>;

  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'jwt-access-token' };

  const baseRow = (data: Record<string, unknown>): CvRecord => ({
    id: 'cv-1',
    user_id: user.id,
    title: 'CV',
    data,
    created_at: 'c',
    updated_at: 'u',
  });

  const meta = {
    version: 'v1.0.0',
    canonical: 'http://app.test/dashboard/cv/cv-1',
  };

  beforeEach(async () => {
    cvService = {
      findOne: jest.fn(),
      persistValidatedData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvItemService,
        {
          provide: CvService,
          useValue: cvService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'APP_URL') return 'http://app.test';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get(CvItemService);
  });

  it('creates a work entry and returns index with bumped version', async () => {
    cvService.findOne.mockResolvedValue(baseRow({ meta, work: [] }));
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        work: [{ name: 'Acme', position: 'Engineer' }],
      }),
    );

    const result = await service.createArrayItem(
      user,
      'cv-1',
      'work',
      { name: 'Acme', position: 'Engineer' },
      'v1.0.0',
    );

    expect(result.index).toBe(0);
    expect(result.version).toBe('v1.0.1');
    expect(cvService.persistValidatedData).toHaveBeenCalled();
  });

  it('throws 409 when client version is stale', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v2.0.0' },
        work: [],
      }),
    );

    await expect(
      service.createArrayItem(user, 'cv-1', 'work', { name: 'Acme' }, 'v1.0.0'),
    ).rejects.toThrow(ConflictException);
  });

  it('throws 404 when deleting missing education entry', async () => {
    cvService.findOne.mockResolvedValue(baseRow({ meta, education: [] }));

    await expect(
      service.deleteArrayItem(user, 'cv-1', 'education', '0', 'Education entry', 'v1.0.0'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates nested work highlight', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        work: [{ name: 'Acme', highlights: [] }],
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        work: [{ name: 'Acme', highlights: ['Shipped feature X'] }],
      }),
    );

    const result = await service.createNestedString(
      user,
      'cv-1',
      'work',
      '0',
      'highlights',
      'Shipped feature X',
      'Work entry',
      'v1.0.0',
    );

    expect(result.parentIndex).toBe(0);
    expect(result.childIndex).toBe(0);
    expect(result.value).toBe('Shipped feature X');
  });

  it('updates basics and merges with existing data', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        basics: { name: 'Jane', label: 'Developer' },
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        basics: { name: 'Jane Doe', label: 'Developer' },
      }),
    );

    const result = await service.updateBasics(user, 'cv-1', { name: 'Jane Doe' }, 'v1.0.0');

    expect(result.item).toEqual({ name: 'Jane Doe', label: 'Developer' });
    expect(result.version).toBe('v1.0.1');
  });

  it('creates, updates, and deletes profiles', async () => {
    cvService.findOne.mockResolvedValue(baseRow({ meta, basics: { profiles: [] } }));
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        basics: { profiles: [{ network: 'GitHub', username: 'jane' }] },
      }),
    );

    const created = await service.createProfile(
      user,
      'cv-1',
      { network: 'GitHub', username: 'jane' },
      'v1.0.0',
    );
    expect(created.index).toBe(0);

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        basics: { profiles: [{ network: 'GitHub', username: 'jane' }] },
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.2' },
        basics: { profiles: [{ network: 'GitHub', username: 'jane-doe' }] },
      }),
    );

    const updated = await service.updateProfile(
      user,
      'cv-1',
      '0',
      { username: 'jane-doe' },
      'v1.0.1',
    );
    expect(updated.item).toEqual({ network: 'GitHub', username: 'jane-doe' });

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.2' },
        basics: { profiles: [{ network: 'GitHub', username: 'jane-doe' }] },
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.3' },
        basics: { profiles: [] },
      }),
    );

    const deleted = await service.deleteProfile(user, 'cv-1', '0', 'v1.0.2');
    expect(deleted.index).toBe(0);
  });

  it('throws 404 when profile index is out of range', async () => {
    cvService.findOne.mockResolvedValue(baseRow({ meta, basics: { profiles: [] } }));

    await expect(
      service.updateProfile(user, 'cv-1', '0', { username: 'x' }, 'v1.0.0'),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates and deletes array items', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        skills: [{ name: 'TypeScript', level: 'Expert' }],
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        skills: [{ name: 'TypeScript', level: 'Master' }],
      }),
    );

    const updated = await service.updateArrayItem(
      user,
      'cv-1',
      'skills',
      '0',
      { level: 'Master' },
      'Skill',
      'v1.0.0',
    );
    expect(updated.item).toEqual({ name: 'TypeScript', level: 'Master' });

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        skills: [{ name: 'TypeScript', level: 'Master' }],
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.2' },
        skills: [],
      }),
    );

    const deleted = await service.deleteArrayItem(user, 'cv-1', 'skills', '0', 'Skill', 'v1.0.1');
    expect(deleted.index).toBe(0);
  });

  it('updates and deletes nested strings', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        work: [{ name: 'Acme', highlights: ['Built API'] }],
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        work: [{ name: 'Acme', highlights: ['Built REST API'] }],
      }),
    );

    const updated = await service.updateNestedString(
      user,
      'cv-1',
      'work',
      '0',
      'highlights',
      '0',
      'Built REST API',
      'Work entry',
      'v1.0.0',
    );
    expect(updated.value).toBe('Built REST API');

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        work: [{ name: 'Acme', highlights: ['Built REST API'] }],
      }),
    );
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.2' },
        work: [{ name: 'Acme', highlights: [] }],
      }),
    );

    const deleted = await service.deleteNestedString(
      user,
      'cv-1',
      'work',
      '0',
      'highlights',
      '0',
      'Work entry',
      'v1.0.1',
    );
    expect(deleted.childIndex).toBe(0);
  });

  it('throws 404 when nested string index is out of range', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        work: [{ name: 'Acme', highlights: [] }],
      }),
    );

    await expect(
      service.updateNestedString(
        user,
        'cv-1',
        'work',
        '0',
        'highlights',
        '0',
        'Missing',
        'Work entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for invalid index', () => {
    expect(() =>
      service.deleteArrayItem(user, 'cv-1', 'work', 'bad', 'Work entry', 'v1.0.0'),
    ).toThrow(BadRequestException);
  });

  it('initializes missing resume structures while mutating', async () => {
    cvService.findOne.mockResolvedValue(baseRow({ meta }));
    cvService.persistValidatedData.mockImplementation(async (_user, _id, data) =>
      baseRow({ ...data, meta: { ...meta, version: 'v1.0.1' } }),
    );

    await service.createProfile(user, 'cv-1', { network: 'LinkedIn' }, 'v1.0.0');
    expect(cvService.persistValidatedData).toHaveBeenCalledWith(
      user,
      'cv-1',
      expect.objectContaining({
        basics: expect.objectContaining({
          profiles: [{ network: 'LinkedIn' }],
        }),
      }),
    );

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1' },
        work: [{ highlights: 'not-an-array' }],
      }),
    );

    const nested = await service.createNestedString(
      user,
      'cv-1',
      'work',
      '0',
      'highlights',
      'First highlight',
      'Work entry',
      'v1.0.1',
    );
    expect(nested.value).toBe('First highlight');
  });

  it('throws 404 when deleting missing profile or nested item', async () => {
    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        basics: { profiles: [{ network: 'GitHub' }] },
      }),
    );

    await expect(service.deleteProfile(user, 'cv-1', '1', 'v1.0.0')).rejects.toThrow(
      NotFoundException,
    );

    cvService.findOne.mockResolvedValue(
      baseRow({
        meta,
        work: [{ name: 'Acme', highlights: ['One'] }],
      }),
    );

    await expect(
      service.deleteNestedString(
        user,
        'cv-1',
        'work',
        '0',
        'highlights',
        '1',
        'Work entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('falls back to CORS_ORIGIN when APP_URL is unset', async () => {
    const module = await Test.createTestingModule({
      providers: [
        CvItemService,
        { provide: CvService, useValue: cvService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'CORS_ORIGIN') return 'http://cors.test,http://other.test';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    const corsService = module.get(CvItemService);
    cvService.findOne.mockResolvedValue(baseRow({ meta, work: [] }));
    cvService.persistValidatedData.mockResolvedValue(
      baseRow({
        meta: { ...meta, version: 'v1.0.1', canonical: 'http://cors.test/dashboard/cv/cv-1' },
        work: [{ name: 'Acme' }],
      }),
    );

    await corsService.createArrayItem(user, 'cv-1', 'work', { name: 'Acme' }, 'v1.0.0');

    expect(cvService.persistValidatedData).toHaveBeenCalled();
  });
});
