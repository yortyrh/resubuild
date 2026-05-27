/**
 * Scenarios referenced from openspec/changes/cv-granular-item-management (item CRUD, 409, 404).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { CvService } from './cv.service';
import { CvItemService } from './cv-item.service';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { createMockNormalizedRepo, mockCvHeader } from './cv-test.helpers';

describe('CvItemService', () => {
  let service: CvItemService;
  let cvService: jest.Mocked<Pick<CvService, 'getHeader' | 'bumpVersion'>>;
  let normalizedRepo: ReturnType<typeof createMockNormalizedRepo>;

  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'jwt-access-token' };
  const supabaseStub = {};

  let workRows: Record<string, unknown>[] = [];
  let profileRows: Record<string, unknown>[] = [];
  let skillRows: Record<string, unknown>[] = [];
  let educationRows: Record<string, unknown>[] = [];
  let versionCounter = 0;

  function nextVersion(): string {
    versionCounter += 1;
    return `v1.0.${versionCounter}`;
  }

  function resetStore() {
    workRows = [];
    profileRows = [];
    skillRows = [];
    educationRows = [];
    versionCounter = 0;
  }

  let currentMetaVersion = 'v1.0.0';

  function setupListMock(section: string, rows: Record<string, unknown>[]) {
    normalizedRepo.listSectionRows.mockImplementation(async (_sb, _cvId, key) => {
      if (key === section) return rows as never;
      if (key === 'profiles') return profileRows as never;
      if (key === 'work') return workRows as never;
      if (key === 'skills') return skillRows as never;
      if (key === 'education') return educationRows as never;
      return [] as never;
    });
  }

  beforeEach(async () => {
    resetStore();
    currentMetaVersion = 'v1.0.0';
    cvService = {
      getHeader: jest
        .fn()
        .mockImplementation(async () => mockCvHeader({ meta_version: currentMetaVersion })),
      bumpVersion: jest.fn().mockImplementation(async () => {
        currentMetaVersion = nextVersion();
        return currentMetaVersion;
      }),
    };
    normalizedRepo = createMockNormalizedRepo();
    normalizedRepo.createClientForUser.mockReturnValue(supabaseStub as never);

    normalizedRepo.getSectionRowById.mockImplementation(async (_sb, _cvId, section, rowId) => {
      const store =
        section === 'work'
          ? workRows
          : section === 'profiles'
            ? profileRows
            : section === 'skills'
              ? skillRows
              : section === 'education'
                ? educationRows
                : [];
      return (store.find((row) => row.id === rowId) as never) ?? null;
    });

    normalizedRepo.insertSectionRow.mockImplementation(async (_sb, _cvId, section, item) => {
      const row = {
        id: crypto.randomUUID(),
        cv_id: 'cv-1',
        sort: section === 'profiles' ? profileRows.length : skillRows.length,
        ...item,
      };
      if (section === 'work') workRows.push(row);
      if (section === 'profiles') profileRows.push(row);
      if (section === 'skills') skillRows.push(row);
      if (section === 'education') educationRows.push(row);
      return row;
    });

    normalizedRepo.updateSectionRow.mockImplementation(async (_sb, _cvId, section, rowId, item) => {
      const store =
        section === 'work'
          ? workRows
          : section === 'profiles'
            ? profileRows
            : section === 'skills'
              ? skillRows
              : educationRows;
      const index = store.findIndex((r) => r.id === rowId);
      if (index < 0) throw new NotFoundException('Not found');
      store[index] = { ...store[index], ...item };
      return store[index];
    });

    normalizedRepo.deleteSectionRow.mockImplementation(async (_sb, _cvId, section, rowId) => {
      const store =
        section === 'work'
          ? workRows
          : section === 'profiles'
            ? profileRows
            : section === 'skills'
              ? skillRows
              : educationRows;
      const index = store.findIndex((r) => r.id === rowId);
      if (index < 0) throw new NotFoundException('Not found');
      store.splice(index, 1);
    });

    normalizedRepo.updateBasicsHeader.mockImplementation(async (_sb, _cvId, basics) =>
      mockCvHeader({
        name: (basics.name as string) ?? 'Jane',
        label: (basics.label as string) ?? 'Developer',
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvItemService,
        { provide: CvService, useValue: cvService },
        { provide: CvNormalizedRepository, useValue: normalizedRepo },
      ],
    }).compile();

    service = module.get(CvItemService);
  });

  it('creates a work entry and returns item with bumped version', async () => {
    const result = await service.createArrayItem(
      user,
      'cv-1',
      'work',
      { name: 'Acme', position: 'Engineer' },
      'v1.0.0',
    );

    expect(result.item).toMatchObject({ name: 'Acme', position: 'Engineer' });
    expect((result.item as { id?: string }).id).toEqual(expect.any(String));
    expect(result.version).toBe('v1.0.1');
    expect(normalizedRepo.insertSectionRow).toHaveBeenCalled();
    expect(normalizedRepo.listSectionRows).not.toHaveBeenCalled();
  });

  it('strips empty optional url before persisting work entries', async () => {
    await service.createArrayItem(
      user,
      'cv-1',
      'work',
      {
        name: 'TechNova',
        position: 'Senior Software Engineer',
        url: '',
        highlights: ['Shipped features'],
      },
      'v1.0.0',
    );

    expect(normalizedRepo.insertSectionRow).toHaveBeenCalledWith(
      supabaseStub,
      'cv-1',
      'work',
      expect.objectContaining({
        name: 'TechNova',
        position: 'Senior Software Engineer',
        highlights: ['Shipped features'],
      }),
    );
  });

  it('throws 409 when client version is stale', async () => {
    cvService.getHeader.mockResolvedValue(mockCvHeader({ meta_version: 'v2.0.0' }));

    await expect(
      service.createArrayItem(user, 'cv-1', 'work', { name: 'Acme' }, 'v1.0.0'),
    ).rejects.toThrow(ConflictException);
  });

  it('throws 404 when deleting missing education entry', async () => {
    await expect(
      service.deleteArrayItem(
        user,
        'cv-1',
        'education',
        '00000000-0000-4000-8000-000000000001',
        'Education entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates work entry with full highlights array via parent save', async () => {
    workRows = [
      {
        id: 'work-1',
        cv_id: 'cv-1',
        name: 'Acme',
        highlights: ['Built API'],
        start_date: '2020-01',
      },
    ];

    const updated = await service.updateArrayItem(
      user,
      'cv-1',
      'work',
      'work-1',
      { highlights: ['Built REST API', 'Led team'] },
      'Work entry',
      'v1.0.0',
    );

    expect(updated.item).toMatchObject({
      highlights: ['Built REST API', 'Led team'],
    });
    expect(normalizedRepo.updateSectionRow).toHaveBeenCalledWith(
      supabaseStub,
      'cv-1',
      'work',
      'work-1',
      expect.objectContaining({
        highlights: ['Built REST API', 'Led team'],
      }),
    );
  });

  it('updates education entry with full courses array via parent save', async () => {
    educationRows = [
      {
        id: 'edu-1',
        cv_id: 'cv-1',
        institution: 'University',
        courses: ['CS101'],
      },
    ];

    const updated = await service.updateArrayItem(
      user,
      'cv-1',
      'education',
      'edu-1',
      { courses: ['CS101', 'CS102'] },
      'Education entry',
      'v1.0.0',
    );

    expect(updated.item).toMatchObject({
      courses: ['CS101', 'CS102'],
    });
  });

  it('updates basics and merges with existing data', async () => {
    cvService.getHeader.mockResolvedValue(mockCvHeader({ name: 'Jane', label: 'Developer' }));
    setupListMock('profiles', []);

    const result = await service.updateBasics(user, 'cv-1', { name: 'Jane Doe' }, 'v1.0.0');

    expect(result.item).toMatchObject({ name: 'Jane Doe', label: 'Developer' });
    expect(result.version).toBe('v1.0.1');
  });

  it('creates, updates, and deletes profiles', async () => {
    const created = await service.createProfile(
      user,
      'cv-1',
      { network: 'GitHub', username: 'jane' },
      'v1.0.0',
    );
    const profileId = (created.item as { id: string }).id;

    const updated = await service.updateProfile(
      user,
      'cv-1',
      profileId,
      { username: 'jane-doe' },
      'v1.0.1',
    );
    expect(updated.item).toMatchObject({ network: 'GitHub', username: 'jane-doe' });

    await service.deleteProfile(user, 'cv-1', profileId, 'v1.0.2');
    expect(profileRows).toHaveLength(0);
  });

  it('throws 404 when profile id is unknown', async () => {
    await expect(
      service.updateProfile(
        user,
        'cv-1',
        '00000000-0000-4000-8000-000000000099',
        { username: 'x' },
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates and deletes array items', async () => {
    skillRows = [
      { id: 'skill-1', cv_id: 'cv-1', sort: 0, name: 'TypeScript', level: 'Expert', keywords: [] },
    ];

    const updated = await service.updateArrayItem(
      user,
      'cv-1',
      'skills',
      'skill-1',
      { level: 'Master' },
      'Skill',
      'v1.0.0',
    );
    expect(updated.item).toMatchObject({ name: 'TypeScript', level: 'Master' });

    await service.deleteArrayItem(user, 'cv-1', 'skills', 'skill-1', 'Skill', 'v1.0.1');
    expect(skillRows).toHaveLength(0);
  });

  it('throws NotFoundException for unknown array item id', async () => {
    await expect(
      service.deleteArrayItem(
        user,
        'cv-1',
        'work',
        '00000000-0000-4000-8000-000000000099',
        'Work entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('reorders skills and returns updated order', async () => {
    skillRows = [
      { id: 'a', cv_id: 'cv-1', sort: 0, name: 'A', keywords: [] },
      { id: 'b', cv_id: 'cv-1', sort: 1, name: 'B', keywords: [] },
      { id: 'c', cv_id: 'cv-1', sort: 2, name: 'C', keywords: [] },
    ];
    normalizedRepo.reorderSection.mockImplementation(async () => [
      { id: 'c', cv_id: 'cv-1', sort: 0, name: 'C', keywords: [] },
      { id: 'a', cv_id: 'cv-1', sort: 1, name: 'A', keywords: [] },
      { id: 'b', cv_id: 'cv-1', sort: 2, name: 'B', keywords: [] },
    ]);

    const result = await service.reorderSection(user, 'cv-1', 'skills', ['c', 'a', 'b'], 'v1.0.0');

    expect(result.items.map((i) => i.name)).toEqual(['C', 'A', 'B']);
    expect(result.version).toBe('v1.0.1');
  });

  it('getSection returns assembled items for a section', async () => {
    workRows = [{ id: 'w1', cv_id: 'cv-1', name: 'Acme', start_date: '2022-01', highlights: [] }];
    setupListMock('work', workRows);

    const items = await service.getSection(user, 'cv-1', 'work');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Acme');
  });

  it('getBasics returns header fields and profiles', async () => {
    cvService.getHeader.mockResolvedValue(
      mockCvHeader({
        name: 'Alex',
        label: 'Dev',
        location: { city: 'Paris' },
      }),
    );
    profileRows = [{ id: 'p1', cv_id: 'cv-1', sort: 0, network: 'GitHub', username: 'alex' }];
    setupListMock('profiles', profileRows);

    const basics = await service.getBasics(user, 'cv-1');
    expect(basics.name).toBe('Alex');
    expect(basics.label).toBe('Dev');
    expect(basics.location).toEqual({ city: 'Paris' });
    expect(basics.profiles).toHaveLength(1);
  });

  it('reorderSection rejects non sort-backed sections', async () => {
    await expect(service.reorderSection(user, 'cv-1', 'work', ['a'], 'v1.0.0')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('reorderSection throws 409 on stale version', async () => {
    await expect(service.reorderSection(user, 'cv-1', 'skills', ['a'], 'v9.9.9')).rejects.toThrow(
      ConflictException,
    );
  });

  it('deleteProfile throws 404 when profile id is missing', async () => {
    await expect(
      service.deleteProfile(user, 'cv-1', '00000000-0000-4000-8000-000000000099', 'v1.0.0'),
    ).rejects.toThrow(NotFoundException);
  });

  it('createArrayItem rejects unknown section key', () => {
    expect(() => service.createArrayItem(user, 'cv-1', 'unknown', {}, 'v1.0.0')).toThrow(
      BadRequestException,
    );
  });

  it('updateArrayItem rejects unknown section key', () => {
    expect(() =>
      service.updateArrayItem(
        user,
        'cv-1',
        'unknown',
        '00000000-0000-4000-8000-000000000001',
        {},
        'Item',
        'v1.0.0',
      ),
    ).toThrow(BadRequestException);
  });

  it('deleteArrayItem rejects unknown section key', () => {
    expect(() =>
      service.deleteArrayItem(
        user,
        'cv-1',
        'unknown',
        '00000000-0000-4000-8000-000000000001',
        'Item',
        'v1.0.0',
      ),
    ).toThrow(BadRequestException);
  });

  it('updateArrayItem throws 404 when item id is unknown', async () => {
    await expect(
      service.updateArrayItem(
        user,
        'cv-1',
        'work',
        '00000000-0000-4000-8000-000000000099',
        { name: 'X' },
        'Work entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteArrayItem throws 404 when item id is unknown', async () => {
    await expect(
      service.deleteArrayItem(
        user,
        'cv-1',
        'work',
        '00000000-0000-4000-8000-000000000099',
        'Work entry',
        'v1.0.0',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
