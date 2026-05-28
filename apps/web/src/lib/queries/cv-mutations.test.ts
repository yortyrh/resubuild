// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockDeleteCv = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    deleteCv: (...args: unknown[]) => mockDeleteCv(...args),
  };
});

import {
  mergeSectionItemInCache,
  useCreateCv,
  useDeleteCv,
  useSectionItemMutations,
} from '@/lib/queries/cv-mutations';
import { cvKeys } from '@/lib/queries/keys';
import { createTestQueryClient, renderHookWithQueryClient } from '@/lib/queries/test-utils';

describe('mergeSectionItemInCache', () => {
  it('merges an updated item into the section cache', () => {
    const queryClient = createTestQueryClient();
    const cvId = 'cv-1';
    const sectionKey = 'work';

    queryClient.setQueryData(cvKeys.section(cvId, sectionKey), [
      { id: 'item-1', name: 'Acme', position: 'Dev' },
      { id: 'item-2', name: 'Beta', position: 'Lead' },
    ]);

    mergeSectionItemInCache(queryClient, cvId, sectionKey, {
      id: 'item-1',
      position: 'Senior Dev',
    });

    expect(queryClient.getQueryData(cvKeys.section(cvId, sectionKey))).toEqual([
      { id: 'item-1', name: 'Acme', position: 'Senior Dev' },
      { id: 'item-2', name: 'Beta', position: 'Lead' },
    ]);
  });

  it('leaves cache unchanged when section data is missing', () => {
    const queryClient = createTestQueryClient();

    mergeSectionItemInCache(queryClient, 'cv-2', 'skills', { id: 's1', name: 'TypeScript' });

    expect(queryClient.getQueryData(cvKeys.section('cv-2', 'skills'))).toBeUndefined();
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
});

describe('useSectionItemMutations', () => {
  it('returns a mutation runner', () => {
    const { result } = renderHookWithQueryClient(() => useSectionItemMutations('cv-1', 'work'));

    expect(typeof result.current.run).toBe('function');
    expect(result.current.saving).toBe(false);
  });
});
