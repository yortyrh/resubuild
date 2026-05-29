// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCvResumeForPreview } from './cv-preview-resume';

vi.mock('@/lib/api', () => ({
  getCvBasics: vi.fn(),
  getCvProfiles: vi.fn(),
  getCvWork: vi.fn(),
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
  parseMediaIdFromImageUrl: vi.fn(),
  profilePhotoPreviewUrl: vi.fn(),
}));

import {
  getCvAwards,
  getCvBasics,
  getCvCertificates,
  getCvEducation,
  getCvInterests,
  getCvLanguages,
  getCvProfiles,
  getCvProjects,
  getCvPublications,
  getCvReferences,
  getCvSkills,
  getCvVolunteer,
  getCvWork,
  parseMediaIdFromImageUrl,
  profilePhotoPreviewUrl,
} from '@/lib/api';

const emptySections = () => {
  vi.mocked(getCvVolunteer).mockResolvedValue([]);
  vi.mocked(getCvEducation).mockResolvedValue([]);
  vi.mocked(getCvSkills).mockResolvedValue([]);
  vi.mocked(getCvProjects).mockResolvedValue([]);
  vi.mocked(getCvAwards).mockResolvedValue([]);
  vi.mocked(getCvCertificates).mockResolvedValue([]);
  vi.mocked(getCvPublications).mockResolvedValue([]);
  vi.mocked(getCvLanguages).mockResolvedValue([]);
  vi.mocked(getCvInterests).mockResolvedValue([]);
  vi.mocked(getCvReferences).mockResolvedValue([]);
};

describe('fetchCvResumeForPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCvBasics).mockResolvedValue({ name: 'Jane Doe', label: 'Engineer' });
    vi.mocked(getCvProfiles).mockResolvedValue([]);
    vi.mocked(getCvWork).mockResolvedValue([{ name: 'Acme', position: 'Dev' }]);
    emptySections();
    vi.mocked(parseMediaIdFromImageUrl).mockReturnValue(null);
  });

  it('assembles basics and non-empty sections', async () => {
    const resume = await fetchCvResumeForPreview('cv-1');

    expect(resume.basics?.name).toBe('Jane Doe');
    expect(resume.work).toHaveLength(1);
    expect(resume.education).toBeUndefined();
  });

  it('uses thumbnail URL for owned profile media', async () => {
    vi.mocked(getCvBasics).mockResolvedValue({
      name: 'Jane',
      image: 'http://localhost:3001/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    vi.mocked(parseMediaIdFromImageUrl).mockReturnValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    vi.mocked(profilePhotoPreviewUrl).mockReturnValue(
      'http://localhost:3001/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/thumbnail',
    );

    const resume = await fetchCvResumeForPreview('cv-1');

    expect(resume.basics?.image).toContain('/thumbnail');
  });
});
