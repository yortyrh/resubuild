import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '@/lib/queries/test-utils';
import { cvKeys } from './keys';

function isPrefix(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.length <= key.length && prefix.every((part, index) => key[index] === part);
}

describe('cvKeys shapes', () => {
  it('keeps the CV list keys', () => {
    expect(cvKeys.all).toEqual(['cv']);
    expect(cvKeys.list()).toEqual(['cv', 'list']);
  });

  it('keys the CV base (title and basics) by cv id', () => {
    expect(cvKeys.detail('cv-1')).toEqual(['cv', 'detail', 'cv-1']);
  });

  it('keys every section of a CV outside the detail key', () => {
    expect(cvKeys.sections('cv-1')).toEqual(['cv', 'section', 'cv-1']);
  });

  it('keys a section list', () => {
    expect(cvKeys.sectionList('cv-1', 'work')).toEqual(['cv', 'section', 'cv-1', 'work', 'list']);
  });

  it('keys the items of a section', () => {
    expect(cvKeys.sectionItems('cv-1', 'work')).toEqual(['cv', 'section', 'cv-1', 'work', 'item']);
  });

  it('keys a single section item by id', () => {
    expect(cvKeys.sectionItem('cv-1', 'work', 'w1')).toEqual([
      'cv',
      'section',
      'cv-1',
      'work',
      'item',
      'w1',
    ]);
  });

  it('no longer exposes the old nested section key', () => {
    expect('section' in cvKeys).toBe(false);
  });
});

describe('cvKeys prefix invariants', () => {
  const cvId = 'cv-1';

  it('detail is not a prefix of any section key', () => {
    const detail = cvKeys.detail(cvId);
    expect(isPrefix(detail, cvKeys.sections(cvId))).toBe(false);
    expect(isPrefix(detail, cvKeys.sectionList(cvId, 'work'))).toBe(false);
    expect(isPrefix(detail, cvKeys.sectionItems(cvId, 'work'))).toBe(false);
    expect(isPrefix(detail, cvKeys.sectionItem(cvId, 'work', 'w1'))).toBe(false);
  });

  it('a section list is not a prefix of its item keys', () => {
    expect(isPrefix(cvKeys.sectionList(cvId, 'work'), cvKeys.sectionItem(cvId, 'work', 'w1'))).toBe(
      false,
    );
    expect(isPrefix(cvKeys.sectionList(cvId, 'work'), cvKeys.sectionItems(cvId, 'work'))).toBe(
      false,
    );
  });

  it('sectionItems is a prefix of each sectionItem', () => {
    expect(
      isPrefix(cvKeys.sectionItems(cvId, 'work'), cvKeys.sectionItem(cvId, 'work', 'w1')),
    ).toBe(true);
  });

  it('sections(cvId) is a prefix of every list and item of that CV only', () => {
    expect(isPrefix(cvKeys.sections(cvId), cvKeys.sectionList(cvId, 'skills'))).toBe(true);
    expect(isPrefix(cvKeys.sections(cvId), cvKeys.sectionItem(cvId, 'skills', 's1'))).toBe(true);
    expect(isPrefix(cvKeys.sections(cvId), cvKeys.sectionList('cv-2', 'skills'))).toBe(false);
  });

  it('one section list is not a prefix of another section list', () => {
    expect(isPrefix(cvKeys.sectionList(cvId, 'work'), cvKeys.sectionList(cvId, 'volunteer'))).toBe(
      false,
    );
  });
});

describe('cvKeys invalidation scope', () => {
  function seed() {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(cvKeys.detail('cv-1'), { id: 'cv-1' });
    queryClient.setQueryData(cvKeys.sectionList('cv-1', 'work'), [{ id: 'w1' }]);
    queryClient.setQueryData(cvKeys.sectionItem('cv-1', 'work', 'w1'), { id: 'w1' });
    queryClient.setQueryData(cvKeys.sectionList('cv-1', 'skills'), [{ id: 's1' }]);
    queryClient.setQueryData(cvKeys.sectionList('cv-2', 'work'), [{ id: 'x1' }]);
    return queryClient;
  }

  function invalidated(queryClient: ReturnType<typeof seed>, key: readonly unknown[]) {
    return queryClient.getQueryState(key)?.isInvalidated;
  }

  it('invalidating the CV detail touches no section list or item', async () => {
    const queryClient = seed();

    await queryClient.invalidateQueries({ queryKey: cvKeys.detail('cv-1') });

    expect(invalidated(queryClient, cvKeys.detail('cv-1'))).toBe(true);
    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'work'))).toBe(false);
    expect(invalidated(queryClient, cvKeys.sectionItem('cv-1', 'work', 'w1'))).toBe(false);
    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'skills'))).toBe(false);
  });

  it('invalidating a section list does not touch its items or other sections', async () => {
    const queryClient = seed();

    await queryClient.invalidateQueries({ queryKey: cvKeys.sectionList('cv-1', 'work') });

    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'work'))).toBe(true);
    expect(invalidated(queryClient, cvKeys.sectionItem('cv-1', 'work', 'w1'))).toBe(false);
    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'skills'))).toBe(false);
    expect(invalidated(queryClient, cvKeys.detail('cv-1'))).toBe(false);
  });

  it('invalidating sections(cvId) covers that CV only', async () => {
    const queryClient = seed();

    await queryClient.invalidateQueries({ queryKey: cvKeys.sections('cv-1') });

    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'work'))).toBe(true);
    expect(invalidated(queryClient, cvKeys.sectionList('cv-1', 'skills'))).toBe(true);
    expect(invalidated(queryClient, cvKeys.sectionList('cv-2', 'work'))).toBe(false);
    expect(invalidated(queryClient, cvKeys.detail('cv-1'))).toBe(false);
  });
});
