// @vitest-environment jsdom
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDeleteCv = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    deleteCv: (...args: unknown[]) => mockDeleteCv(...args),
  };
});

import type { CvItemMutationResponse } from '@/lib/cv-item-api';
import * as cvMutations from '@/lib/queries/cv-mutations';
import {
  invalidateCvSection,
  removeSectionItem,
  useCreateCv,
  useDeleteCv,
  useSectionItemMutations,
  writeSectionItem,
  writeSectionList,
} from '@/lib/queries/cv-mutations';
import { cvKeys } from '@/lib/queries/keys';
import { createTestQueryClient, renderHookWithQueryClient } from '@/lib/queries/test-utils';

const CV = 'cv-1';

function seedWork(queryClient: ReturnType<typeof createTestQueryClient>) {
  const list = [
    { id: 'item-1', name: 'Acme', position: 'Dev' },
    { id: 'item-2', name: 'Beta', position: 'Lead' },
    { id: 'item-3', name: 'Gamma', position: 'CTO' },
  ];
  queryClient.setQueryData(cvKeys.sectionList(CV, 'work'), list);
  for (const item of list) {
    queryClient.setQueryData(cvKeys.sectionItem(CV, 'work', item.id), item);
  }
  return list;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
  mockDeleteCv.mockReset();
});

describe('writeSectionItem', () => {
  it('writes the item key and merges the entry with the same id in the list', () => {
    const queryClient = createTestQueryClient();
    const [first, , third] = seedWork(queryClient);

    writeSectionItem(queryClient, CV, 'work', { id: 'item-2', position: 'Senior Lead' });

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([
      { id: 'item-1', name: 'Acme', position: 'Dev' },
      { id: 'item-2', name: 'Beta', position: 'Senior Lead' },
      { id: 'item-3', name: 'Gamma', position: 'CTO' },
    ]);
    const list = queryClient.getQueryData<Record<string, unknown>[]>(
      cvKeys.sectionList(CV, 'work'),
    );
    expect(list?.[0]).toBe(first);
    expect(list?.[2]).toBe(third);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-2'))).toEqual(
      expect.objectContaining({ id: 'item-2', position: 'Senior Lead' }),
    );
  });

  it('leaves other item keys untouched', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);

    writeSectionItem(queryClient, CV, 'work', { id: 'item-2', position: 'Senior Lead' });

    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-1'))).toEqual({
      id: 'item-1',
      name: 'Acme',
      position: 'Dev',
    });
  });

  it('does not touch another section or CV', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);
    queryClient.setQueryData(cvKeys.sectionList(CV, 'volunteer'), [{ id: 'item-2', name: 'V' }]);
    queryClient.setQueryData(cvKeys.sectionList('cv-2', 'work'), [{ id: 'item-2', name: 'X' }]);

    writeSectionItem(queryClient, CV, 'work', { id: 'item-2', name: 'Changed' });

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'volunteer'))).toEqual([
      { id: 'item-2', name: 'V' },
    ]);
    expect(queryClient.getQueryData(cvKeys.sectionList('cv-2', 'work'))).toEqual([
      { id: 'item-2', name: 'X' },
    ]);
  });

  it('writes the item key but does not create a list that was not cached', () => {
    const queryClient = createTestQueryClient();

    writeSectionItem(queryClient, 'cv-2', 'skills', { id: 's1', name: 'TypeScript' });

    expect(queryClient.getQueryData(cvKeys.sectionList('cv-2', 'skills'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionItem('cv-2', 'skills', 's1'))).toEqual(
      expect.objectContaining({ id: 's1', name: 'TypeScript' }),
    );
  });

  it('does not add an entry to the list when its id is not there', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);

    writeSectionItem(queryClient, CV, 'work', { id: 'item-9', name: 'New' });

    expect(
      queryClient
        .getQueryData<unknown[]>(cvKeys.sectionList(CV, 'work'))
        ?.map((entry) => (entry as { id: string }).id),
    ).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('ignores items without a string id', () => {
    const queryClient = createTestQueryClient();
    const list = seedWork(queryClient);

    writeSectionItem(queryClient, CV, 'work', { name: 'No id' } as Record<string, unknown>);
    writeSectionItem(queryClient, CV, 'work', { id: 7, name: 'Number id' } as Record<
      string,
      unknown
    >);

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual(list);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: cvKeys.sectionItems(CV, 'work') }),
    ).toHaveLength(3);
  });
});

describe('writeSectionList', () => {
  it('sets the list exactly and seeds each item key', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);
    const next = [
      { id: 'item-3', name: 'Gamma' },
      { id: 'item-1', name: 'Acme 2' },
    ];

    writeSectionList(queryClient, CV, 'work', next);

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual(next);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-1'))).toEqual({
      id: 'item-1',
      name: 'Acme 2',
    });
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-3'))).toEqual({
      id: 'item-3',
      name: 'Gamma',
    });
  });

  it('can set an empty list', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);

    writeSectionList(queryClient, CV, 'work', []);

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([]);
  });
});

describe('removeSectionItem', () => {
  it('removes the entry from the list, keeping the others in order', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);

    removeSectionItem(queryClient, CV, 'work', 'item-2');

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([
      { id: 'item-1', name: 'Acme', position: 'Dev' },
      { id: 'item-3', name: 'Gamma', position: 'CTO' },
    ]);
  });

  it('removes the item query and keeps the other item queries', () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);

    removeSectionItem(queryClient, CV, 'work', 'item-2');

    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'work', 'item-2'))).toBeUndefined();
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-1'))).toEqual({
      id: 'item-1',
      name: 'Acme',
      position: 'Dev',
    });
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-3'))).toBeDefined();
  });

  it('does not create a list that was not cached', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.sectionItem(CV, 'work', 'item-1'), { id: 'item-1' });

    removeSectionItem(queryClient, CV, 'work', 'item-1');

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toBeUndefined();
    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'work', 'item-1'))).toBeUndefined();
  });
});

describe('invalidateCvSection', () => {
  it('invalidates the section list only', async () => {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);
    queryClient.setQueryData(cvKeys.detail(CV), { id: CV });
    queryClient.setQueryData(cvKeys.sectionList(CV, 'skills'), [{ id: 's1' }]);

    await invalidateCvSection(queryClient, CV, 'work');

    expect(queryClient.getQueryState(cvKeys.sectionList(CV, 'work'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(cvKeys.sectionItem(CV, 'work', 'item-1'))?.isInvalidated).toBe(
      false,
    );
    expect(queryClient.getQueryState(cvKeys.detail(CV))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(cvKeys.sectionList(CV, 'skills'))?.isInvalidated).toBe(false);
  });
});

describe('useDeleteCv', () => {
  it('calls deleteCv and invalidates the CV list cache', async () => {
    mockDeleteCv.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.list(), [{ id: 'cv-1', title: 'Engineer CV' }]);

    const { result } = renderHookWithQueryClient(() => useDeleteCv(), { queryClient });
    await result.current.mutateAsync('cv-1');

    expect(mockDeleteCv.mock.calls[0]?.[0]).toBe('cv-1');
    await waitFor(() => {
      expect(queryClient.getQueryState(cvKeys.list())?.isInvalidated).toBe(true);
    });
  });
});

describe('cv mutation hooks', () => {
  it('exports create and delete CV hooks', () => {
    expect(typeof useDeleteCv).toBe('function');
    expect(typeof useCreateCv).toBe('function');
  });

  it('no longer exports mergeSectionItemInCache', () => {
    expect('mergeSectionItemInCache' in cvMutations).toBe(false);
  });
});

describe('useSectionItemMutations', () => {
  function setup() {
    const queryClient = createTestQueryClient();
    seedWork(queryClient);
    const hook = renderHookWithQueryClient(() => useSectionItemMutations(CV, 'work'), {
      queryClient,
    });
    return { queryClient, ...hook };
  }

  it('returns saving, error, setError and run only', () => {
    const { result } = setup();

    expect(Object.keys(result.current).sort()).toEqual(['error', 'run', 'saving', 'setError']);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('is saving while the action is pending, and not after', async () => {
    const { result } = setup();
    const pending = deferred<CvItemMutationResponse>();

    let runPromise: Promise<unknown> | undefined;
    act(() => {
      runPromise = result.current.run(() => pending.promise);
    });
    await waitFor(() => expect(result.current.saving).toBe(true));

    await act(async () => {
      pending.resolve({});
      await runPromise;
    });

    expect(result.current.saving).toBe(false);
  });

  it('writes result.item to the item key and the list when mergeItem is set', async () => {
    const { result, queryClient } = setup();

    await act(async () => {
      await result.current.run(
        async () => ({ item: { id: 'item-2', position: 'Principal' } }),
        undefined,
        undefined,
        { mergeItem: true },
      );
    });

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toEqual([
      { id: 'item-1', name: 'Acme', position: 'Dev' },
      { id: 'item-2', name: 'Beta', position: 'Principal' },
      { id: 'item-3', name: 'Gamma', position: 'CTO' },
    ]);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-2'))).toEqual(
      expect.objectContaining({ position: 'Principal' }),
    );
  });

  it('does not write the cache without mergeItem', async () => {
    const { result, queryClient } = setup();
    const before = queryClient.getQueryData(cvKeys.sectionList(CV, 'work'));

    await act(async () => {
      await result.current.run(async () => ({ item: { id: 'item-2', position: 'Principal' } }));
    });

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toBe(before);
    expect(queryClient.getQueryData(cvKeys.sectionItem(CV, 'work', 'item-2'))).toEqual({
      id: 'item-2',
      name: 'Beta',
      position: 'Lead',
    });
  });

  it('does nothing to the cache with mergeItem when the result has no item', async () => {
    const { result, queryClient } = setup();
    const before = queryClient.getQueryData(cvKeys.sectionList(CV, 'work'));

    await act(async () => {
      await result.current.run(async () => ({}), undefined, undefined, { mergeItem: true });
    });

    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toBe(before);
  });

  it('invalidates the section list before onSuccess when invalidateSection is set', async () => {
    const { result, queryClient } = setup();
    let invalidatedInOnSuccess: boolean | undefined;

    await act(async () => {
      await result.current.run(
        async () => ({}),
        () => {
          invalidatedInOnSuccess = queryClient.getQueryState(
            cvKeys.sectionList(CV, 'work'),
          )?.isInvalidated;
        },
        undefined,
        { invalidateSection: true },
      );
    });

    expect(invalidatedInOnSuccess).toBe(true);
    expect(queryClient.getQueryState(cvKeys.detail(CV))).toBeUndefined();
  });

  it('does not invalidate the section list without invalidateSection', async () => {
    const { result, queryClient } = setup();

    await act(async () => {
      await result.current.run(async () => ({}));
    });

    expect(queryClient.getQueryState(cvKeys.sectionList(CV, 'work'))?.isInvalidated).toBe(false);
  });

  it('toasts the success message and returns the onSuccess result', async () => {
    const { result } = setup();
    const response = { item: { id: 'item-1' } };
    const onSuccess = vi.fn().mockReturnValue('done');
    let returned: unknown;

    await act(async () => {
      returned = await result.current.run(async () => response, onSuccess, 'Work entry updated');
    });

    expect(onSuccess).toHaveBeenCalledWith(response);
    expect(returned).toBe('done');
    expect(mockToastSuccess).toHaveBeenCalledWith('Work entry updated');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('does not toast success without a message', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.run(async () => ({}));
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('on failure sets the error, toasts it, returns undefined and skips onSuccess', async () => {
    const { result, queryClient } = setup();
    const onSuccess = vi.fn();
    const before = queryClient.getQueryData(cvKeys.sectionList(CV, 'work'));
    let returned: unknown = 'not-set';

    await act(async () => {
      returned = await result.current.run(
        async () => {
          throw new Error('Request failed (500)');
        },
        onSuccess,
        'Saved',
        { mergeItem: true, invalidateSection: true },
      );
    });

    expect(returned).toBeUndefined();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Request failed (500)');
    expect(result.current.saving).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('Request failed (500)');
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(cvKeys.sectionList(CV, 'work'))).toBe(before);
    expect(queryClient.getQueryState(cvKeys.sectionList(CV, 'work'))?.isInvalidated).toBe(false);
  });

  it('uses a generic message for non-Error failures', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.run(() => Promise.reject('boom'));
    });

    expect(result.current.error).toBe('Save failed');
  });

  it('clears a previous error when a new run starts', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('First failure')));
    });
    expect(result.current.error).toBe('First failure');

    await act(async () => {
      await result.current.run(async () => ({}));
    });
    expect(result.current.error).toBeNull();
  });

  it('setError sets and clears the error', () => {
    const { result } = setup();

    act(() => result.current.setError('Custom'));
    expect(result.current.error).toBe('Custom');

    act(() => result.current.setError(null));
    expect(result.current.error).toBeNull();
  });
});
