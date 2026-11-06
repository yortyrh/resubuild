// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListCvs = vi.fn();
const mockGetCv = vi.fn();
const mockGetCvWork = vi.fn();
const mockGetCvSkills = vi.fn();

vi.mock('@/lib/api', () => ({
  listCvs: (...args: unknown[]) => mockListCvs(...args),
  getCv: (...args: unknown[]) => mockGetCv(...args),
  getCvWork: (...args: unknown[]) => mockGetCvWork(...args),
  getCvVolunteer: vi.fn(),
  getCvEducation: vi.fn(),
  getCvSkills: (...args: unknown[]) => mockGetCvSkills(...args),
  getCvProjects: vi.fn(),
  getCvAwards: vi.fn(),
  getCvCertificates: vi.fn(),
  getCvPublications: vi.fn(),
  getCvLanguages: vi.fn(),
  getCvInterests: vi.fn(),
  getCvReferences: vi.fn(),
  getCvProfiles: vi.fn(),
}));

import * as cvQueries from '@/lib/queries/cv-queries';
import {
  fetchCvSection,
  fetchCvSectionList,
  useCv,
  useCvList,
  useCvSectionItem,
  useCvSectionList,
} from '@/lib/queries/cv-queries';
import { cvKeys } from '@/lib/queries/keys';
import {
  createNoRetryTestQueryClient,
  createTestQueryClient,
  renderHookWithQueryClient,
} from '@/lib/queries/test-utils';

type WorkRow = { id?: unknown; name?: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockListCvs.mockReset();
  mockGetCv.mockReset();
  mockGetCvWork.mockReset();
  mockGetCvSkills.mockReset();
});

describe('useCvList / useCv', () => {
  it('useCvList loads CV records', async () => {
    mockListCvs.mockResolvedValue([{ id: 'cv-1', title: 'My CV' }]);

    const { result } = renderHookWithQueryClient(() => useCvList());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'cv-1', title: 'My CV' }]);
  });

  it('useCv loads a single CV into the detail key', async () => {
    const cv = { id: 'cv-2', title: 'T', data: { basics: { name: 'Alex' } } };
    mockGetCv.mockResolvedValue(cv);
    const queryClient = createTestQueryClient();

    const { result } = renderHookWithQueryClient(() => useCv('cv-2'), { queryClient });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetCv).toHaveBeenCalledWith('cv-2');
    expect(result.current.data).toEqual(cv);
    expect(queryClient.getQueryData(cvKeys.detail('cv-2'))).toEqual(cv);
  });

  it('useCv does not fetch without a cv id', () => {
    const { result } = renderHookWithQueryClient(() => useCv(''));

    expect(mockGetCv).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('fetchCvSection', () => {
  it('calls the getter of the requested section with the cv id', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1' }]);

    await expect(fetchCvSection('cv-1', 'work')).resolves.toEqual([{ id: 'w1' }]);

    expect(mockGetCvWork).toHaveBeenCalledWith('cv-1');
    expect(mockGetCvSkills).not.toHaveBeenCalled();
  });
});

describe('fetchCvSectionList', () => {
  it('returns the list in server order', async () => {
    const rows = [
      { id: 'w2', name: 'Beta' },
      { id: 'w1', name: 'Acme' },
      { id: 'w3', name: 'Gamma' },
    ];
    mockGetCvWork.mockResolvedValue(rows);
    const queryClient = createTestQueryClient();

    const list = await fetchCvSectionList<WorkRow>(queryClient, 'cv-1', 'work');

    expect(list).toEqual(rows);
    expect(mockGetCvWork).toHaveBeenCalledTimes(1);
    expect(mockGetCvWork).toHaveBeenCalledWith('cv-1');
  });

  it('seeds every item key with its entry', async () => {
    mockGetCvWork.mockResolvedValue([
      { id: 'w1', name: 'Acme' },
      { id: 'w2', name: 'Beta' },
    ]);
    const queryClient = createTestQueryClient();

    await fetchCvSectionList<WorkRow>(queryClient, 'cv-1', 'work');

    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'))).toEqual({
      id: 'w1',
      name: 'Acme',
    });
    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-1', 'work', 'w2'))).toEqual({
      id: 'w2',
      name: 'Beta',
    });
  });

  it('seeds item keys under the requested cv and section only', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1', name: 'Acme' }]);
    const queryClient = createTestQueryClient();

    await fetchCvSectionList<WorkRow>(queryClient, 'cv-1', 'work');

    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-2', 'work', 'w1'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-1', 'skills', 'w1'))).toBeUndefined();
  });

  it('skips entries without a string id but still returns them', async () => {
    const rows = [{ name: 'No id' }, { id: 42, name: 'Number id' }, { id: 'w1', name: 'Acme' }];
    mockGetCvWork.mockResolvedValue(rows);
    const queryClient = createTestQueryClient();

    const list = await fetchCvSectionList<WorkRow>(queryClient, 'cv-1', 'work');

    expect(list).toEqual(rows);
    const itemQueries = queryClient
      .getQueryCache()
      .findAll({ queryKey: cvKeys.sectionItems('cv-1', 'work') });
    expect(itemQueries.map((query) => query.queryKey)).toEqual([
      cvKeys.sectionItem('cv-1', 'work', 'w1'),
    ]);
  });

  it('returns an empty list when the server has no entries and seeds nothing', async () => {
    mockGetCvWork.mockResolvedValue([]);
    const queryClient = createTestQueryClient();

    await expect(fetchCvSectionList(queryClient, 'cv-1', 'work')).resolves.toEqual([]);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: cvKeys.sectionItems('cv-1', 'work') }),
    ).toHaveLength(0);
  });
});

describe('useCvSectionList', () => {
  it('has no data until the server answers, then the server list', async () => {
    const pending = deferred<WorkRow[]>();
    mockGetCvWork.mockReturnValue(pending.promise);

    const { result } = renderHookWithQueryClient(() => useCvSectionList<WorkRow>('cv-1', 'work'));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);

    pending.resolve([
      { id: 'w2', name: 'Beta' },
      { id: 'w1', name: 'Acme' },
    ]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: 'w2', name: 'Beta' },
      { id: 'w1', name: 'Acme' },
    ]);
  });

  it('caches the list under sectionList and seeds the item keys', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1', name: 'Acme' }]);
    const queryClient = createTestQueryClient();

    const { result } = renderHookWithQueryClient(() => useCvSectionList<WorkRow>('cv-1', 'work'), {
      queryClient,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(cvKeys.sectionList('cv-1', 'work'))).toEqual([
      { id: 'w1', name: 'Acme' },
    ]);
    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'))).toEqual({
      id: 'w1',
      name: 'Acme',
    });
  });

  it('returns [] only when the server returned []', async () => {
    mockGetCvWork.mockResolvedValue([]);

    const { result } = renderHookWithQueryClient(() => useCvSectionList('cv-1', 'work'));

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('is disabled without a cv id', () => {
    const { result } = renderHookWithQueryClient(() => useCvSectionList('', 'work'));

    expect(mockGetCvWork).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('reports a failed load as an error, not as an empty list', async () => {
    mockGetCvWork.mockRejectedValue(new Error('Request failed (500)'));

    const { result } = renderHookWithQueryClient(() => useCvSectionList('cv-1', 'work'), {
      queryClient: createNoRetryTestQueryClient(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe('Request failed (500)');
  });
});

describe('useCvSectionItem', () => {
  it('serves a seeded item from the cache without a request', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'), {
      id: 'w1',
      name: 'Acme',
    });

    const { result } = renderHookWithQueryClient(
      () => useCvSectionItem<WorkRow>('cv-1', 'work', 'w1'),
      { queryClient },
    );

    expect(result.current.data).toEqual({ id: 'w1', name: 'Acme' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockGetCvWork).not.toHaveBeenCalled();
  });

  it('serves items seeded by the list fetch', async () => {
    mockGetCvWork.mockResolvedValue([
      { id: 'w1', name: 'Acme' },
      { id: 'w2', name: 'Beta' },
    ]);
    const queryClient = createTestQueryClient();
    await fetchCvSectionList(queryClient, 'cv-1', 'work');

    const { result } = renderHookWithQueryClient(
      () => useCvSectionItem<WorkRow>('cv-1', 'work', 'w2'),
      { queryClient },
    );

    expect(result.current.data).toEqual({ id: 'w2', name: 'Beta' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockGetCvWork).toHaveBeenCalledTimes(1);
  });

  it('reflects writes to its item key', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'), {
      id: 'w1',
      name: 'Acme',
    });

    const { result } = renderHookWithQueryClient(
      () => useCvSectionItem<WorkRow>('cv-1', 'work', 'w1'),
      { queryClient },
    );

    queryClient.setQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'), {
      id: 'w1',
      name: 'Acme Corp',
    });

    await waitFor(() => expect(result.current.data).toEqual({ id: 'w1', name: 'Acme Corp' }));
  });

  it('loads the section list when its key is empty and returns the matching item', async () => {
    mockGetCvWork.mockResolvedValue([
      { id: 'w1', name: 'Acme' },
      { id: 'w2', name: 'Beta' },
    ]);

    const { result } = renderHookWithQueryClient(() =>
      useCvSectionItem<WorkRow>('cv-1', 'work', 'w2'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 'w2', name: 'Beta' });
    expect(mockGetCvWork).toHaveBeenCalledWith('cv-1');
  });

  it('errors when the item is not in the loaded list', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1', name: 'Acme' }]);

    const { result } = renderHookWithQueryClient(
      () => useCvSectionItem<WorkRow>('cv-1', 'work', 'missing'),
      { queryClient: createNoRetryTestQueryClient() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('removed exports', () => {
  it('no longer exports useCvSection', () => {
    expect('useCvSection' in cvQueries).toBe(false);
  });
});
