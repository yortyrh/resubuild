// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockGetCv = vi.fn();
const mockGetCvWork = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getCv: (...args: unknown[]) => mockGetCv(...args),
    getCvWork: (...args: unknown[]) => mockGetCvWork(...args),
  };
});

import { createQueryWrapper, createTestQueryClient } from '@/lib/queries/test-utils';
import { CvEditorProvider, useCvEditor } from './cv-editor-provider';

function renderEditor(cvId = 'cv-1') {
  const queryClient = createTestQueryClient();
  const QueryWrapper = createQueryWrapper(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryWrapper>
      <CvEditorProvider cvId={cvId}>{children}</CvEditorProvider>
    </QueryWrapper>
  );
  return { queryClient, ...renderHook(() => useCvEditor(), { wrapper }) };
}

describe('CvEditorProvider', () => {
  afterEach(() => cleanup());

  it('exposes only cvId, mountedSection and setMountedSection', () => {
    const { result } = renderEditor();

    expect(Object.keys(result.current).sort()).toEqual([
      'cvId',
      'mountedSection',
      'setMountedSection',
    ]);
    expect(result.current.cvId).toBe('cv-1');
    expect(result.current.mountedSection).toBeNull();
  });

  it('updates mountedSection through setMountedSection', () => {
    const { result } = renderEditor();

    act(() => result.current.setMountedSection('work'));
    expect(result.current.mountedSection).toBe('work');

    act(() => result.current.setMountedSection('skills'));
    expect(result.current.mountedSection).toBe('skills');
  });

  it('keeps setMountedSection stable across renders', () => {
    const { result } = renderEditor();
    const first = result.current.setMountedSection;

    act(() => result.current.setMountedSection('work'));

    expect(result.current.setMountedSection).toBe(first);
  });

  it('fetches nothing', async () => {
    const { queryClient } = renderEditor();

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockGetCv).not.toHaveBeenCalled();
    expect(mockGetCvWork).not.toHaveBeenCalled();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useCvEditor())).toThrow(
      'useCvEditor must be used within CvEditorProvider',
    );
  });
});
