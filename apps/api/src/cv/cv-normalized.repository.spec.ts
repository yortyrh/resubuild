import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Resume } from '@resumind/types';
import { createClient } from '@supabase/supabase-js';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { mockCvHeader } from './cv-test.helpers';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

type QueryResult = { data: unknown; error: { message: string } | null };

function createSupabaseMock(handlers: {
  from?: (table: string) => object;
}): ReturnType<typeof createClient> {
  const defaultChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  return {
    from: jest.fn((table: string) => {
      if (handlers.from) {
        return handlers.from(table);
      }
      return { ...defaultChain };
    }),
  } as never;
}

describe('CvNormalizedRepository', () => {
  let repo: CvNormalizedRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CvNormalizedRepository,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'SUPABASE_URL'
                ? 'https://supa.test'
                : key === 'SUPABASE_ANON_KEY'
                  ? 'key'
                  : undefined,
          },
        },
      ],
    }).compile();

    repo = module.get(CvNormalizedRepository);
    mockedCreateClient.mockReset();
  });

  it('creates user-scoped supabase client', () => {
    mockedCreateClient.mockReturnValue({} as never);
    const client = repo.createUserClient('token-123');
    expect(client).toBeDefined();
    expect(mockedCreateClient).toHaveBeenCalledWith(
      'https://supa.test',
      'key',
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer token-123' } },
      }),
    );
  });

  it('createUserClient throws when Supabase is not configured', () => {
    const bare = new CvNormalizedRepository({
      get: () => undefined,
    } as unknown as ConfigService);
    expect(() => bare.createUserClient('token')).toThrow('Supabase is not configured');
  });

  it('createClientForUser delegates to createUserClient', () => {
    mockedCreateClient.mockReturnValue({} as never);
    const spy = jest.spyOn(repo, 'createUserClient');
    repo.createClientForUser({ accessToken: 'tok' } as never);
    expect(spy).toHaveBeenCalledWith('tok');
  });

  it('fetchHeader returns row or null', async () => {
    const header = mockCvHeader();
    const supabase = createSupabaseMock({
      from: (table) => {
        if (table !== 'cv') throw new Error(`unexpected table ${table}`);
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: header, error: null }),
            }),
          }),
        };
      },
    });

    await expect(repo.fetchHeader(supabase, 'cv-1')).resolves.toEqual(header);
  });

  it('fetchHeader throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'db fail' },
            }),
          }),
        }),
      }),
    });

    await expect(repo.fetchHeader(supabase, 'cv-1')).rejects.toThrow(BadRequestException);
  });

  it('assembleFullResume returns null when header missing', async () => {
    jest.spyOn(repo, 'fetchHeader').mockResolvedValue(null);
    const supabase = createSupabaseMock({});
    await expect(repo.assembleFullResume(supabase, 'cv-1')).resolves.toBeNull();
  });

  it('assembleFullResume assembles header and sections', async () => {
    const header = mockCvHeader({ name: 'Alex', label: 'Dev' });
    jest.spyOn(repo, 'fetchHeader').mockResolvedValue(header);
    jest.spyOn(repo, 'fetchSections').mockResolvedValue({
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

    const supabase = createSupabaseMock({});
    const resume = await repo.assembleFullResume(supabase, 'cv-1');
    expect(resume?.basics?.name).toBe('Alex');
    expect(resume?.basics?.label).toBe('Dev');
  });

  it('fetchSections loads and sorts all section tables', async () => {
    const workRow = {
      id: 'w1',
      cv_id: 'cv-1',
      name: 'Co',
      start_date: '2020-01',
      highlights: [],
    };
    const skillRow = { id: 's1', cv_id: 'cv-1', sort: 0, name: 'TS', keywords: [] };

    const supabase = createSupabaseMock({
      from: (table) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: table === 'cv_work' ? [workRow] : table === 'cv_skill' ? [skillRow] : [],
            error: null,
          }),
        }),
      }),
    });

    const sections = await repo.fetchSections(supabase, 'cv-1');
    expect(sections.work).toHaveLength(1);
    expect(sections.skills).toHaveLength(1);
    expect(sections.awards).toEqual([]);
  });

  it('getNextSort returns 0 for empty section', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    });

    await expect(repo.getNextSort(supabase, 'cv-1', 'skills')).resolves.toBe(0);
  });

  it('getNextSort returns max sort + 1', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ sort: 2 }], error: null }),
            }),
          }),
        }),
      }),
    });

    await expect(repo.getNextSort(supabase, 'cv-1', 'skills')).resolves.toBe(3);
  });

  it('listSectionRows returns sorted rows', async () => {
    const rows = [
      { id: 'a', cv_id: 'cv-1', sort: 1, name: 'B' },
      { id: 'b', cv_id: 'cv-1', sort: 0, name: 'A' },
    ];
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    });

    const result = await repo.listSectionRows(supabase, 'cv-1', 'skills');
    expect(result.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('getSectionRowByIndex returns row at index', async () => {
    jest.spyOn(repo, 'listSectionRows').mockResolvedValue([{ id: 'only' }] as never);

    const supabase = createSupabaseMock({});
    await expect(repo.getSectionRowByIndex(supabase, 'cv-1', 'skills', 0)).resolves.toEqual({
      id: 'only',
    });
    await expect(repo.getSectionRowByIndex(supabase, 'cv-1', 'skills', 1)).resolves.toBeNull();
  });

  it('insertSectionRow assigns sort for sort-backed sections', async () => {
    jest.spyOn(repo, 'getNextSort').mockResolvedValue(4);
    const inserted = { id: 'new', cv_id: 'cv-1', sort: 4, name: 'Go' };
    const supabase = createSupabaseMock({
      from: () => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: inserted, error: null }),
          }),
        }),
      }),
    });

    const result = await repo.insertSectionRow(supabase, 'cv-1', 'skills', { name: 'Go' });
    expect(result).toEqual(inserted);
  });

  it('insertSectionRow omits sort for date-backed sections', async () => {
    const getNextSort = jest.spyOn(repo, 'getNextSort');
    const inserted = { id: 'w1', cv_id: 'cv-1', name: 'Job', highlights: [] };
    const supabase = createSupabaseMock({
      from: () => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: inserted, error: null }),
          }),
        }),
      }),
    });

    await repo.insertSectionRow(supabase, 'cv-1', 'work', {
      name: 'Job',
      startDate: '2024-01',
    });
    expect(getNextSort).not.toHaveBeenCalled();
  });

  it('updateSectionRow and deleteSectionRow call supabase', async () => {
    const updated = { id: 's1', name: 'Rust' };
    const updateSingle = jest.fn().mockResolvedValue({ data: updated, error: null });
    const deleteEq = jest.fn().mockResolvedValue({ error: null });

    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({ single: updateSingle }),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ eq: deleteEq }),
        }),
      }),
    });

    await expect(
      repo.updateSectionRow(supabase, 'cv-1', 'skills', 's1', { name: 'Rust' }),
    ).resolves.toEqual(updated);
    await expect(repo.deleteSectionRow(supabase, 'cv-1', 'skills', 's1')).resolves.toBeUndefined();
    expect(deleteEq).toHaveBeenCalled();
  });

  it('updateBasicsHeader merges scalar and location fields', async () => {
    const header = mockCvHeader({ name: 'Pat', location: { city: 'Paris' } });
    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: header, error: null }),
            }),
          }),
        }),
      }),
    });

    const result = await repo.updateBasicsHeader(supabase, 'cv-1', {
      name: 'Pat',
      location: { city: 'Paris' },
    });
    expect(result.name).toBe('Pat');
  });

  it('bumpMetaVersion updates meta columns', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: { meta_version: 'v2.0.0' }, error: null }),
            }),
          }),
        }),
      }),
    });

    await expect(
      repo.bumpMetaVersion(supabase, 'cv-1', {
        version: 'v2.0.0',
        canonical: 'http://x',
        lastModified: '2024-02-01',
      }),
    ).resolves.toBe('v2.0.0');
  });

  it('insertNormalizedCv updates header and section rows', async () => {
    const header = mockCvHeader();
    const resume: Resume = {
      basics: { name: 'Sam', label: 'Eng' },
      work: [{ name: 'Acme', startDate: '2023-01', highlights: ['Shipped'] }],
      skills: [{ name: 'TS', keywords: ['types'] }],
    };

    jest.spyOn(repo, 'fetchHeader').mockResolvedValue(header);

    const insert = jest.fn().mockResolvedValue({ error: null });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const supabase = createSupabaseMock({
      from: (table) => {
        if (table === 'cv') {
          return { update: jest.fn().mockReturnValue({ eq: updateEq }) };
        }
        return { insert };
      },
    });

    await expect(repo.insertNormalizedCv(supabase, 'cv-1', 'user-1', resume)).resolves.toEqual(
      header,
    );
    expect(updateEq).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });

  it('insertNormalizedCv throws when header missing after insert', async () => {
    jest.spyOn(repo, 'fetchHeader').mockResolvedValue(null);
    const supabase = createSupabaseMock({
      from: (table) =>
        table === 'cv'
          ? {
              update: jest
                .fn()
                .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
            }
          : { insert: jest.fn().mockResolvedValue({ error: null }) },
    });

    await expect(
      repo.insertNormalizedCv(supabase, 'cv-1', 'user-1', { basics: { name: 'X' } }),
    ).rejects.toThrow('CV not found after insert');
  });

  it('replaceNormalizedCv deletes all sections then inserts', async () => {
    const header = mockCvHeader();
    const deleteEq = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(repo, 'insertNormalizedCv').mockResolvedValue(header);

    const supabase = createSupabaseMock({
      from: () => ({
        delete: jest.fn().mockReturnValue({ eq: deleteEq }),
      }),
    });

    await expect(
      repo.replaceNormalizedCv(supabase, 'cv-1', { basics: { name: 'New' } }),
    ).resolves.toEqual(header);
    expect(deleteEq).toHaveBeenCalled();
  });

  it('fetchSections throws when a section query fails', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'section fail' },
          }),
        }),
      }),
    });

    await expect(repo.fetchSections(supabase, 'cv-1')).rejects.toThrow('section fail');
  });

  it('getNextSort throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'sort query fail' } }),
            }),
          }),
        }),
      }),
    });

    await expect(repo.getNextSort(supabase, 'cv-1', 'skills')).rejects.toThrow('sort query fail');
  });

  it('insertSectionRow throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'insert row fail' } }),
          }),
        }),
      }),
    });

    await expect(
      repo.insertSectionRow(supabase, 'cv-1', 'work', { name: 'X', startDate: '2024-01' }),
    ).rejects.toThrow('insert row fail');
  });

  it('updateSectionRow throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: 'update row fail' } }),
              }),
            }),
          }),
        }),
      }),
    });

    await expect(
      repo.updateSectionRow(supabase, 'cv-1', 'work', 'w1', { name: 'Y' }),
    ).rejects.toThrow('update row fail');
  });

  it('deleteSectionRow throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: { message: 'delete row fail' } }),
          }),
        }),
      }),
    });

    await expect(repo.deleteSectionRow(supabase, 'cv-1', 'work', 'w1')).rejects.toThrow(
      'delete row fail',
    );
  });

  it('updateBasicsHeader throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'basics fail' } }),
            }),
          }),
        }),
      }),
    });

    await expect(repo.updateBasicsHeader(supabase, 'cv-1', { name: 'Z' })).rejects.toThrow(
      'basics fail',
    );
  });

  it('bumpMetaVersion throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'meta fail' } }),
            }),
          }),
        }),
      }),
    });

    await expect(
      repo.bumpMetaVersion(supabase, 'cv-1', {
        version: 'v1',
        canonical: 'c',
        lastModified: 'd',
      }),
    ).rejects.toThrow('meta fail');
  });

  it('listSectionRows throws on supabase error', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'list fail' },
          }),
        }),
      }),
    });

    await expect(repo.listSectionRows(supabase, 'cv-1', 'skills')).rejects.toThrow('list fail');
  });

  it('insertNormalizedCv throws on header or section insert errors', async () => {
    const supabase = createSupabaseMock({
      from: (table) => {
        if (table === 'cv') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: { message: 'header fail' } }),
            }),
          };
        }
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      },
    });

    await expect(
      repo.insertNormalizedCv(supabase, 'cv-1', 'user-1', { basics: { name: 'A' } }),
    ).rejects.toThrow('header fail');

    const supabaseInsert = createSupabaseMock({
      from: (table) => {
        if (table === 'cv') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: { message: 'section insert fail' } }),
        };
      },
    });

    await expect(
      repo.insertNormalizedCv(supabaseInsert, 'cv-1', 'user-1', {
        basics: { name: 'A' },
        work: [{ name: 'Job', startDate: '2024-01', highlights: [] }],
      }),
    ).rejects.toThrow('section insert fail');
  });

  it('replaceNormalizedCv throws when section delete fails', async () => {
    const supabase = createSupabaseMock({
      from: () => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: { message: 'delete fail' } }),
        }),
      }),
    });

    await expect(
      repo.replaceNormalizedCv(supabase, 'cv-1', { basics: { name: 'N' } }),
    ).rejects.toThrow('delete fail');
  });

  describe('reorderSection', () => {
    it('rejects non sort-backed sections', async () => {
      const supabase = createSupabaseMock({});
      await expect(repo.reorderSection(supabase, 'cv-1', 'work', [])).rejects.toThrow(
        'does not support reorder',
      );
    });

    it('rejects unknown ids', async () => {
      const supabase = createSupabaseMock({});
      jest.spyOn(repo, 'listSectionRows').mockResolvedValue([
        { id: 'a', sort: 0 },
        { id: 'b', sort: 1 },
      ] as never);

      await expect(repo.reorderSection(supabase, 'cv-1', 'skills', ['a', 'c'])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects wrong length and duplicate ids', async () => {
      const supabase = createSupabaseMock({});
      jest
        .spyOn(repo, 'listSectionRows')
        .mockResolvedValueOnce([{ id: 'a', sort: 0 }] as never)
        .mockResolvedValueOnce([
          { id: 'a', sort: 0 },
          { id: 'b', sort: 1 },
        ] as never);

      await expect(repo.reorderSection(supabase, 'cv-1', 'skills', [])).rejects.toThrow(
        'every row id exactly once',
      );
      await expect(repo.reorderSection(supabase, 'cv-1', 'skills', ['a', 'a'])).rejects.toThrow(
        'duplicate ids',
      );
    });

    it('throws when sort update fails', async () => {
      const supabase = createSupabaseMock({
        from: () => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: { message: 'sort fail' } }),
            }),
          }),
        }),
      });

      jest.spyOn(repo, 'listSectionRows').mockResolvedValue([{ id: 'a', sort: 0 }] as never);

      await expect(repo.reorderSection(supabase, 'cv-1', 'skills', ['a'])).rejects.toThrow(
        'sort fail',
      );
    });

    it('updates sort for each id and returns reordered list', async () => {
      const supabase = createSupabaseMock({
        from: () => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      });

      const finalRows = [
        { id: 'b', sort: 0 },
        { id: 'a', sort: 1 },
      ];
      jest
        .spyOn(repo, 'listSectionRows')
        .mockResolvedValueOnce([
          { id: 'a', sort: 0 },
          { id: 'b', sort: 1 },
        ] as never)
        .mockResolvedValueOnce(finalRows as never);

      await expect(repo.reorderSection(supabase, 'cv-1', 'skills', ['b', 'a'])).resolves.toEqual(
        finalRows,
      );
    });
  });
});
