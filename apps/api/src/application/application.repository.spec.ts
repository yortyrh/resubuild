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
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    });

    await expect(repository.findAll(user)).resolves.toEqual(rows);
  });

  it('returns empty list when query succeeds with null data', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
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
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'list failed' } }),
      }),
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
});
