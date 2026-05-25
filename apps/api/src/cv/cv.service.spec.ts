/**
 * Scenarios referenced from openspec/specs/cv-rest-api (CRUD, 409 concurrency, baseline create flow).
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getResumeMetaVersion } from '@resumind/types';
import { createClient } from '@supabase/supabase-js';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { type CvRecord, CvService } from './cv.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

describe('CvService', () => {
  let service: CvService;
  let getConfig: jest.Mock;

  const user = { id: 'user-1', email: 'u@test.com', accessToken: 'jwt-access-token' };

  beforeEach(async () => {
    getConfig = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvService,
        ResumeSchemaValidator,
        {
          provide: ConfigService,
          useValue: { get: (k: string) => getConfig(k) },
        },
      ],
    }).compile();

    service = module.get(CvService);
    mockedCreateClient.mockReset();

    getConfig.mockImplementation((key: string) => {
      switch (key) {
        case 'SUPABASE_URL':
          return 'https://supa.test';
        case 'SUPABASE_ANON_KEY':
          return 'anon-key';
        case 'APP_URL':
          return 'http://app.test.example';
        case 'CORS_ORIGIN':
          return 'http://cors.secondary,http://fallback';
        default:
          return undefined;
      }
    });
  });

  it('throws when SUPABASE credentials are incomplete', async () => {
    getConfig.mockImplementation((key: string) =>
      key === 'SUPABASE_ANON_KEY' ? 'only-anon' : undefined,
    );
    await expect(service.findAll(user)).rejects.toThrow('Supabase is not configured');
  });

  describe('findAll', () => {
    it('Scenario: List CVs — returns ordered rows via PostgREST', async () => {
      const rows: CvRecord[] = [
        {
          id: 'a',
          user_id: user.id,
          title: 't',
          data: {},
          created_at: '1',
          updated_at: '2',
        },
      ];
      const order = jest.fn().mockResolvedValue({ data: rows, error: null });
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({ order })),
        })),
      } as never);

      await expect(service.findAll(user)).resolves.toEqual(rows);
      expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('wraps PostgREST failures as BadRequest', async () => {
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'policy violated' },
            }),
          })),
        })),
      } as never);

      await expect(service.findAll(user)).rejects.toThrow(BadRequestException);
      await expect(service.findAll(user)).rejects.toThrow('policy violated');
    });

    it('defaults null data responses to empty list', async () => {
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      } as never);

      await expect(service.findAll(user)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('Scenario: Missing CV — 404 with stable message', async () => {
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      } as never);

      await expect(service.findOne(user, 'gone')).rejects.toThrow(NotFoundException);
      await expect(service.findOne(user, 'gone')).rejects.toThrow('CV not found');
    });

    it('surfaced transport errors via BadRequest', async () => {
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'timeout' } }),
            })),
          })),
        })),
      } as never);

      await expect(service.findOne(user, 'x')).rejects.toThrow('timeout');
    });
  });

  describe('create', () => {
    it('Scenario: Successful create inserts placeholder row THEN persists validated merged data', async () => {
      const insertedRow: CvRecord = {
        id: 'fresh-id',
        user_id: user.id,
        title: 'Untitled CV',
        data: {},
        created_at: 'c',
        updated_at: 'c',
      };

      let persistedDocument: Record<string, unknown> | undefined;
      let persistedTitle: string | undefined;
      let hit = 0;
      const single = jest.fn().mockImplementation(async () => {
        hit += 1;
        if (hit === 1) return { data: insertedRow, error: null };
        return {
          data: persistedDocument
            ? {
                ...insertedRow,
                data: persistedDocument,
                title: persistedTitle ?? insertedRow.title,
              }
            : insertedRow,
          error: null,
        };
      });

      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
          update: jest.fn((payload: { data?: Record<string, unknown>; title?: string }) => {
            persistedDocument = payload.data;
            persistedTitle = payload.title;
            return {
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single,
                })),
              })),
            };
          }),
        })),
      } as never);

      const result = await service.create(user, { title: 'Starter', data: {} });

      expect(persistedDocument?.meta).toEqual(
        expect.objectContaining({
          canonical: 'http://app.test.example/dashboard/cv/fresh-id',
          version: 'v1.0.0',
          lastModified: expect.any(String),
        }),
      );
      expect(result.data.meta).toEqual(persistedDocument?.meta);
      expect(persistedTitle).toBe('Untitled CV');

      mockedCreateClient.mock.calls.forEach(([, anon, cfg]) => {
        expect(cfg).toEqual(
          expect.objectContaining({
            global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
          }),
        );
        expect(anon).toBe('anon-key');
      });
    });

    it('derives title from basics name and label on create', async () => {
      const insertedRow: CvRecord = {
        id: 'fresh-id',
        user_id: user.id,
        title: 'Untitled CV',
        data: {},
        created_at: 'c',
        updated_at: 'c',
      };

      let persistedTitle: string | undefined;
      let hit = 0;
      const single = jest.fn().mockImplementation(async () => {
        hit += 1;
        if (hit === 1) return { data: insertedRow, error: null };
        return { data: { ...insertedRow, title: persistedTitle }, error: null };
      });

      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
          update: jest.fn((payload: { title?: string }) => {
            persistedTitle = payload.title;
            return {
              eq: jest.fn(() => ({
                select: jest.fn(() => ({ single })),
              })),
            };
          }),
        })),
      } as never);

      await service.create(user, {
        data: { basics: { name: 'Jane Doe', label: 'Software Engineer' } },
      });

      expect(persistedTitle).toBe('Jane Doe — Software Engineer');
    });

    it('fails BAD_REQUEST during insert.single', async () => {
      const singleInsert = jest
        .fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'violates FK' } });

      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single: singleInsert })),
          })),
        })),
      } as never);

      await expect(service.create(user, { data: {} })).rejects.toThrow('violates FK');
    });

    it('fails BAD_REQUEST when second update rejects', async () => {
      const insertedRow: CvRecord = {
        id: 'fresh-id',
        user_id: user.id,
        title: 'Untitled CV',
        data: {},
        created_at: 'c',
        updated_at: 'c',
      };
      let hit = 0;
      const single = jest.fn().mockImplementation(async () => {
        hit += 1;
        if (hit === 1) return { data: insertedRow, error: null };
        return { data: null, error: { message: 'second write failed' } };
      });

      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single,
              })),
            })),
          })),
        })),
      } as never);

      await expect(service.create(user, { data: {} })).rejects.toThrow('second write failed');
    });

    it('falls back first CORS_ORIGIN entry when APP_URL missing', async () => {
      getConfig.mockImplementation((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://supa.test';
        if (key === 'SUPABASE_ANON_KEY') return 'anon-key';
        if (key === 'CORS_ORIGIN') return 'https://portal.example/other,ignored';
        return undefined;
      });

      const insertedRow: CvRecord = {
        id: 'fallback-id',
        user_id: user.id,
        title: 'Untitled CV',
        data: {},
        created_at: 'c',
        updated_at: 'c',
      };

      let persistedDocument: Record<string, unknown> | undefined;
      let hit = 0;
      const single = jest.fn().mockImplementation(async () => {
        hit += 1;
        if (hit === 1) return { data: insertedRow, error: null };
        return {
          data: persistedDocument ? { ...insertedRow, data: persistedDocument } : insertedRow,
          error: null,
        };
      });

      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
          update: jest.fn((payload: { data?: Record<string, unknown> }) => {
            persistedDocument = payload.data;
            return {
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single,
                })),
              })),
            };
          }),
        })),
      } as never);

      await service.create(user, { data: {} });

      expect(String((persistedDocument?.meta as { canonical?: string })?.canonical)).toBe(
        'https://portal.example/other/dashboard/cv/fallback-id',
      );
    });
  });

  describe('update', () => {
    const canonicalRow = (version: string): CvRecord => ({
      id: 'cid',
      user_id: user.id,
      title: 'Old title',
      data: {
        meta: { canonical: 'http://canonical/cid', version, lastModified: 't0' },
        basics: {},
      },
      created_at: 'c',
      updated_at: 'u',
    });

    function stubFind(findData: CvRecord | null): void {
      mockedCreateClient.mockImplementation(
        () =>
          ({
            from: jest.fn(() => ({
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: findData, error: null }),
                })),
              })),
            })),
          }) as unknown as ReturnType<typeof createClient>,
      );
    }

    function stubTwoStepFindThenPatch(
      findData: CvRecord,
      patchOutcome: {
        data: CvRecord | null;
        error: { message?: string } | null;
      },
    ): void {
      let invocation = 0;
      mockedCreateClient.mockImplementation(
        () =>
          ({
            from: jest.fn(() => {
              invocation += 1;
              if (invocation === 1) {
                return {
                  select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      maybeSingle: jest.fn().mockResolvedValue({ data: findData, error: null }),
                    })),
                  })),
                };
              }
              return {
                update: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                      maybeSingle: jest.fn().mockResolvedValue(patchOutcome),
                    })),
                  })),
                })),
              };
            }),
          }) as unknown as ReturnType<typeof createClient>,
      );
    }

    it('Scenario: PATCH only title skips optimistic concurrency comparator', async () => {
      const row = canonicalRow('v9.9.9');
      stubTwoStepFindThenPatch(row, {
        data: { ...row, title: 'Edited' },
        error: null,
      });

      const out = await service.update(user, 'cid', { title: 'Edited' });
      expect(out.title).toBe('Edited');
    });

    it('Scenario: Conflicting optimistic version emits 409 with reload guidance', async () => {
      stubFind(canonicalRow('v10.1.5'));

      await expect(
        service.update(user, 'cid', {
          data: {
            basics: {},
            meta: { canonical: 'x', version: 'v10.1.4', lastModified: 'past' },
          },
        }),
      ).rejects.toThrow(ConflictException);

      // findOne allocates a client before update() allocates a second client, then conflict throws.
      expect(mockedCreateClient).toHaveBeenCalledTimes(2);
    });

    it('Scenario: Persist after matching meta token versions', async () => {
      const row = canonicalRow('v10.2.7');
      let patchPayload: Record<string, unknown> | undefined;
      let invocation = 0;
      mockedCreateClient.mockImplementation(
        () =>
          ({
            from: jest.fn(() => {
              invocation += 1;
              if (invocation === 1) {
                return {
                  select: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
                    })),
                  })),
                };
              }
              return {
                update: jest.fn((payload: Record<string, unknown>) => {
                  patchPayload = payload;
                  return {
                    eq: jest.fn(() => ({
                      select: jest.fn(() => ({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: { ...row, ...payload },
                          error: null,
                        }),
                      })),
                    })),
                  };
                }),
              };
            }),
          }) as unknown as ReturnType<typeof createClient>,
      );

      const out = await service.update(user, 'cid', {
        data: {
          basics: { name: 'Jane Doe', label: 'Developer' },
          meta: row.data.meta,
        },
      });

      expect(out.id).toBe('cid');
      expect(patchPayload?.title).toBe('Jane Doe — Developer');
      expect(mockedCreateClient).toHaveBeenCalledTimes(2);
      expect(typeof getResumeMetaVersion(out.data)).toBe('string');
    });

    it('THEN NotFound once patch emits empty row envelope', async () => {
      const row = canonicalRow('v8.9.11');
      stubTwoStepFindThenPatch(row, { data: null, error: null });

      await expect(service.update(user, 'cid', { title: 't' })).rejects.toThrow(NotFoundException);
    });

    it('THEN BadRequest wraps PostgREST errors from patch step', async () => {
      const row = canonicalRow('v1.100.103');
      stubTwoStepFindThenPatch(row, { data: null, error: { message: 'rls forbid' } });

      await expect(service.update(user, 'cid', { title: 'rename' })).rejects.toThrow('rls forbid');
    });

    it('THEN NotFound cascade when precursor findOne resolves empty', async () => {
      stubFind(null);

      await expect(service.update(user, 'cid', { title: 'only' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistValidatedData', () => {
    it('derives and persists title alongside validated data', async () => {
      let patchPayload: Record<string, unknown> | undefined;
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          update: jest.fn((payload: Record<string, unknown>) => {
            patchPayload = payload;
            return {
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'cid',
                      user_id: user.id,
                      title: payload.title,
                      data: payload.data,
                      created_at: 'c',
                      updated_at: 'u',
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }),
        })),
      } as never);

      const result = await service.persistValidatedData(user, 'cid', {
        basics: { name: 'Ada Lovelace', label: 'Mathematician' },
      });

      expect(patchPayload?.title).toBe('Ada Lovelace — Mathematician');
      expect(result.title).toBe('Ada Lovelace — Mathematician');
    });
  });

  describe('remove', () => {
    function deleteMaybeSingle(resolve: Record<string, unknown>) {
      mockedCreateClient.mockReturnValue({
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue(resolve),
              })),
            })),
          })),
        })),
      } as never);
    }

    it('Scenario: Missing delete target — 404', async () => {
      deleteMaybeSingle({ data: null, error: null });
      await expect(service.remove(user, 'missing')).rejects.toThrow('CV not found');
    });

    it('Propagates BAD_REQUEST textual errors during delete RPC', async () => {
      deleteMaybeSingle({
        data: null,
        error: { message: 'rpc failure' },
      });
      await expect(service.remove(user, 'id')).rejects.toThrow(BadRequestException);
    });

    it('Resolves cleanly when deletion succeeded', async () => {
      deleteMaybeSingle({ data: { id: 'removed' }, error: null });
      await expect(service.remove(user, 'removed')).resolves.toBeUndefined();
    });
  });
});
