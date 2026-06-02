import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import { ApplicationRepository } from './application.repository';

describe('ApplicationRepository', () => {
  const user = {
    id: 'u1',
    email: 'u@test.dev',
    accessToken: 'tok',
  } as AuthenticatedRequest['user'];

  let repository: ApplicationRepository;
  let normalizedRepo: { createClientForUser: jest.Mock };
  let supabase: { from: jest.Mock };

  beforeEach(() => {
    supabase = { from: jest.fn() };
    normalizedRepo = {
      createClientForUser: jest.fn().mockReturnValue(supabase),
    };
    repository = new ApplicationRepository(normalizedRepo as never);
  });

  it('creates a job application row', async () => {
    const row = { id: 'app-1', status: 'queued' };
    supabase.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    });

    await expect(
      repository.create(user, {
        status: 'queued',
        job_source_type: 'text',
        user_message: 'Tailor for leadership',
      }),
    ).resolves.toEqual(row);
  });

  it('throws when create fails', async () => {
    supabase.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
        }),
      }),
    });

    await expect(
      repository.create(user, { status: 'queued', job_source_type: 'text' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists applications ordered by updated_at', async () => {
    const rows = [{ id: 'app-2' }, { id: 'app-1' }];
    const order = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq }),
    });

    await expect(repository.findAll(user)).resolves.toEqual(rows);
    expect(eq).toHaveBeenCalledWith('is_list_visible', true);
  });

  it('returns empty list when query succeeds with null data', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq }),
    });

    await expect(repository.findAll(user)).resolves.toEqual([]);
  });

  it('returns null when findOne succeeds without a row', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(repository.findOne(user, 'missing')).resolves.toBeNull();
  });

  it('returns null when update succeeds without a row', async () => {
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.update(user, 'missing', { status: 'failed' })).resolves.toBeNull();
  });

  it('finds one application by id', async () => {
    const row = { id: 'app-1', status: 'ready' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
        }),
      }),
    });

    await expect(repository.findOne(user, 'app-1')).resolves.toEqual(row);
  });

  it('updates an application row', async () => {
    const row = { id: 'app-1', cover_letter: 'Updated letter' };
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      }),
    });

    await expect(
      repository.update(user, 'app-1', { cover_letter: 'Updated letter' }),
    ).resolves.toEqual(row);
  });

  it('removes an application row', async () => {
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'app-1' }, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.remove(user, 'app-1')).resolves.toBe(true);
  });

  it('returns false when remove finds no row', async () => {
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(repository.remove(user, 'missing')).resolves.toBe(false);
  });

  it('throws when list query fails', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'list failed' } });
    const eq = jest.fn().mockReturnValue({ order });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq }),
    });

    await expect(repository.findAll(user)).rejects.toThrow(BadRequestException);
  });

  it('throws when findOne query fails', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'find failed' } }),
        }),
      }),
    });

    await expect(repository.findOne(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('throws when update query fails', async () => {
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'update failed' } }),
          }),
        }),
      }),
    });

    await expect(repository.update(user, 'app-1', { status: 'failed' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when remove query fails', async () => {
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: { message: 'delete failed' } }),
          }),
        }),
      }),
    });

    await expect(repository.remove(user, 'app-1')).rejects.toThrow(BadRequestException);
  });

  it('finds active update draft for source application', async () => {
    const row = { id: 'draft-1', status: 'running' };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const inStatus = jest.fn().mockReturnValue({ order });
    const eqVisible = jest.fn().mockReturnValue({ in: inStatus });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findActiveUpdateDraft(user, 'app-1')).resolves.toEqual(row);
    expect(eqSource).toHaveBeenCalledWith('source_application_id', 'app-1');
    expect(eqVisible).toHaveBeenCalledWith('is_list_visible', false);
  });

  it('returns null when no active update draft exists', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const inStatus = jest.fn().mockReturnValue({ order });
    const eqVisible = jest.fn().mockReturnValue({ in: inStatus });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findActiveUpdateDraft(user, 'app-1')).resolves.toBeNull();
  });

  it('finds dangling update drafts for source application', async () => {
    const rows = [{ id: 'draft-1' }, { id: 'draft-2' }];
    const eqVisible = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findDanglingUpdateDrafts(user, 'app-1')).resolves.toEqual(rows);
  });

  it('returns empty list when dangling draft query succeeds with null data', async () => {
    const eqVisible = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findDanglingUpdateDrafts(user, 'app-1')).resolves.toEqual([]);
  });

  it('throws when findActiveUpdateDraft query fails', async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'draft lookup failed' } });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const inStatus = jest.fn().mockReturnValue({ order });
    const eqVisible = jest.fn().mockReturnValue({ in: inStatus });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findActiveUpdateDraft(user, 'app-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when findDanglingUpdateDrafts query fails', async () => {
    const eqVisible = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'dangling lookup failed' } });
    const eqSource = jest.fn().mockReturnValue({ eq: eqVisible });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqSource }),
    });

    await expect(repository.findDanglingUpdateDrafts(user, 'app-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
