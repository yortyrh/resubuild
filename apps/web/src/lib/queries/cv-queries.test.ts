// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockListCvs = vi.fn();
const mockGetCv = vi.fn();
const mockGetCvWork = vi.fn();

vi.mock('@/lib/api', () => ({
  listCvs: (...args: unknown[]) => mockListCvs(...args),
  getCv: (...args: unknown[]) => mockGetCv(...args),
  getCvWork: (...args: unknown[]) => mockGetCvWork(...args),
  getCvVolunteer: vi.fn(),
  getCvEducation: vi.fn(),
  getCvSkills: vi.fn(),
  getCvProjects: vi.fn(),
  getCvAwards: vi.fn(),
  getCvCertificates: vi.fn(),
  getCvPublications: vi.fn(),
  getCvLanguages: vi.fn(),
  getCvInterests: vi.fn(),
  getCvReferences: vi.fn(),
  getCvProfiles: vi.fn(),
}));

import { useCv, useCvList, useCvSection } from '@/lib/queries/cv-queries';
import { renderHookWithQueryClient } from '@/lib/queries/test-utils';

describe('cv query hooks', () => {
  it('useCvList loads CV records', async () => {
    mockListCvs.mockResolvedValue([{ id: 'cv-1', title: 'My CV' }]);

    const { result } = renderHookWithQueryClient(() => useCvList());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'cv-1', title: 'My CV' }]);
  });

  it('useCv loads a single CV', async () => {
    mockGetCv.mockResolvedValue({ id: 'cv-2', data: { basics: { name: 'Alex' } } });

    const { result } = renderHookWithQueryClient(() => useCv('cv-2'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetCv).toHaveBeenCalledWith('cv-2');
  });

  it('useCvSection loads section rows', async () => {
    mockGetCvWork.mockResolvedValue([{ id: 'w1', name: 'Acme' }]);

    const { result } = renderHookWithQueryClient(() => useCvSection('cv-3', 'work'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'w1', name: 'Acme' }]);
  });
});
