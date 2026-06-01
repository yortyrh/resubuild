import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '@/lib/queries/test-utils';

const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/cv-item-api', () => ({
  cvWorkApi: {
    create: (...args: unknown[]) => mockCreate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  cvVolunteerApi: {
    create: (...args: unknown[]) => mockCreate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@/lib/queries/cv-mutations', () => ({
  invalidateCvSection: (...args: unknown[]) => mockInvalidate(...args),
}));

import { moveWorkVolunteerEntry } from './move-work-volunteer-entry';

describe('moveWorkVolunteerEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ item: { id: 'new-1' } });
    mockDelete.mockResolvedValue({});
    mockInvalidate.mockResolvedValue(undefined);
  });

  it('creates volunteer item then deletes work item on work-to-volunteer move', async () => {
    const queryClient = createTestQueryClient();

    await moveWorkVolunteerEntry(
      queryClient,
      'cv-1',
      'work-to-volunteer',
      {
        name: 'Acme',
        position: 'Dev',
        startDate: '2020-01',
        location: 'Remote',
        description: 'Contract',
      },
      'work-1',
    );

    expect(mockCreate).toHaveBeenCalledWith(
      'cv-1',
      expect.objectContaining({
        organization: 'Acme',
        location: 'Remote',
        description: 'Contract',
      }),
    );
    expect(mockDelete).toHaveBeenCalledWith('cv-1', 'work-1');
    expect(mockInvalidate).toHaveBeenCalledTimes(2);
  });

  it('does not delete source when create fails', async () => {
    mockCreate.mockRejectedValue(new Error('Create failed'));
    const queryClient = createTestQueryClient();

    await expect(
      moveWorkVolunteerEntry(
        queryClient,
        'cv-1',
        'volunteer-to-work',
        { organization: 'NPO', startDate: '2021-01' },
        'vol-1',
      ),
    ).rejects.toThrow('Create failed');

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('maps volunteer organization to work name on volunteer-to-work move', async () => {
    const queryClient = createTestQueryClient();

    await moveWorkVolunteerEntry(
      queryClient,
      'cv-1',
      'volunteer-to-work',
      {
        organization: 'NPO',
        position: 'Lead',
        startDate: '2021-01',
        location: 'Berlin',
        description: 'Part-time',
      },
      'vol-1',
    );

    expect(mockCreate).toHaveBeenCalledWith(
      'cv-1',
      expect.objectContaining({
        name: 'NPO',
        location: 'Berlin',
        description: 'Part-time',
      }),
    );
    expect(mockDelete).toHaveBeenCalledWith('cv-1', 'vol-1');
  });
});
