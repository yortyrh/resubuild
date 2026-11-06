import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cvKeys } from '@/lib/queries/keys';
import { createTestQueryClient } from '@/lib/queries/test-utils';

const workCreate = vi.fn();
const workDelete = vi.fn();
const volunteerCreate = vi.fn();
const volunteerDelete = vi.fn();

vi.mock('@/lib/cv-item-api', () => ({
  cvWorkApi: {
    create: (...args: unknown[]) => workCreate(...args),
    delete: (...args: unknown[]) => workDelete(...args),
  },
  cvVolunteerApi: {
    create: (...args: unknown[]) => volunteerCreate(...args),
    delete: (...args: unknown[]) => volunteerDelete(...args),
  },
}));

import { moveWorkVolunteerEntry } from './move-work-volunteer-entry';

const CV = 'cv-1';

function seed() {
  const queryClient = createTestQueryClient();
  const work = [
    { id: 'work-1', name: 'Acme', startDate: '2020-01' },
    { id: 'work-2', name: 'Beta', startDate: '2018-01' },
  ];
  const volunteer = [{ id: 'vol-1', organization: 'NPO', startDate: '2021-01' }];
  queryClient.setQueryData(cvKeys.sectionList(CV, 'work'), work);
  queryClient.setQueryData(cvKeys.sectionList(CV, 'volunteer'), volunteer);
  for (const item of work) {
    queryClient.setQueryData(cvKeys.sectionItem(CV, 'work', item.id), item);
  }
  for (const item of volunteer) {
    queryClient.setQueryData(cvKeys.sectionItem(CV, 'volunteer', item.id), item);
  }
  queryClient.setQueryData(cvKeys.detail(CV), { id: CV, data: { basics: {} } });
  return queryClient;
}

function isInvalidated(
  queryClient: ReturnType<typeof createTestQueryClient>,
  key: readonly unknown[],
) {
  return queryClient.getQueryState(key)?.isInvalidated;
}

describe('moveWorkVolunteerEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workCreate.mockResolvedValue({ item: { id: 'work-new' } });
    volunteerCreate.mockResolvedValue({ item: { id: 'vol-new' } });
    workDelete.mockResolvedValue({});
    volunteerDelete.mockResolvedValue({});
  });

  it('creates the volunteer entry, then deletes the work entry', async () => {
    const queryClient = seed();

    await moveWorkVolunteerEntry(
      queryClient,
      CV,
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

    expect(volunteerCreate).toHaveBeenCalledWith(
      CV,
      expect.objectContaining({
        organization: 'Acme',
        location: 'Remote',
        description: 'Contract',
      }),
    );
    expect(workDelete).toHaveBeenCalledWith(CV, 'work-1');
    expect(workCreate).not.toHaveBeenCalled();
    expect(volunteerDelete).not.toHaveBeenCalled();
    expect(volunteerCreate.mock.invocationCallOrder[0]).toBeLessThan(
      workDelete.mock.invocationCallOrder[0]!,
    );
  });

  it('removes the moved entry from the work cache and invalidates both lists', async () => {
    const queryClient = seed();

    await moveWorkVolunteerEntry(
      queryClient,
      CV,
      'work-to-volunteer',
      { name: 'Acme', startDate: '2020-01' },
      'work-1',
    );

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([
      { id: 'work-2', name: 'Beta', startDate: '2018-01' },
    ]);
    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'work', 'work-1'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'work-2'))).toBeDefined();
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'work'))).toBe(true);
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'volunteer'))).toBe(true);
    expect(isInvalidated(queryClient, cvKeys.detail(CV))).toBe(false);
    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'volunteer'))).toEqual([
      { id: 'vol-1', organization: 'NPO', startDate: '2021-01' },
    ]);
  });

  it('maps volunteer organization to work name on volunteer-to-work move', async () => {
    const queryClient = seed();

    await moveWorkVolunteerEntry(
      queryClient,
      CV,
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

    expect(workCreate).toHaveBeenCalledWith(
      CV,
      expect.objectContaining({
        name: 'NPO',
        location: 'Berlin',
        description: 'Part-time',
      }),
    );
    expect(volunteerDelete).toHaveBeenCalledWith(CV, 'vol-1');
  });

  it('removes the moved entry from the volunteer cache on volunteer-to-work move', async () => {
    const queryClient = seed();

    await moveWorkVolunteerEntry(
      queryClient,
      CV,
      'volunteer-to-work',
      { organization: 'NPO', startDate: '2021-01' },
      'vol-1',
    );

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'volunteer'))).toEqual([]);
    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'volunteer', 'vol-1'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toHaveLength(2);
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'work'))).toBe(true);
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'volunteer'))).toBe(true);
  });

  it('does not delete the source or touch the cache when create fails', async () => {
    volunteerCreate.mockRejectedValue(new Error('Create failed'));
    workCreate.mockRejectedValue(new Error('Create failed'));
    const queryClient = seed();

    await expect(
      moveWorkVolunteerEntry(
        queryClient,
        CV,
        'volunteer-to-work',
        { organization: 'NPO', startDate: '2021-01' },
        'vol-1',
      ),
    ).rejects.toThrow('Create failed');

    expect(volunteerDelete).not.toHaveBeenCalled();
    expect(workDelete).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'volunteer'))).toHaveLength(1);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'volunteer', 'vol-1'))).toBeDefined();
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'work'))).toBe(false);
    expect(isInvalidated(queryClient, cvKeys.sectionList(CV, 'volunteer'))).toBe(false);
  });

  it('reports a possible duplicate when delete fails after create', async () => {
    workDelete.mockRejectedValue(new Error('Delete failed'));
    const queryClient = seed();

    await expect(
      moveWorkVolunteerEntry(
        queryClient,
        CV,
        'work-to-volunteer',
        { name: 'Acme', startDate: '2020-01' },
        'work-1',
      ),
    ).rejects.toThrow('Delete failed. A duplicate entry may exist in the destination section.');
  });

  it('reports a partial move when delete fails with a non-Error', async () => {
    workDelete.mockRejectedValue('nope');
    const queryClient = seed();

    await expect(
      moveWorkVolunteerEntry(
        queryClient,
        CV,
        'work-to-volunteer',
        { name: 'Acme', startDate: '2020-01' },
        'work-1',
      ),
    ).rejects.toThrow(
      'Move partially failed. A duplicate entry may exist in the destination section.',
    );
  });
});
