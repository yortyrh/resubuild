import type { CvHeaderRow } from '@resumind/types';
import type { CvNormalizedRepository } from './cv-normalized.repository';

export function createMockNormalizedRepo(): jest.Mocked<
  Pick<
    CvNormalizedRepository,
    | 'createClientForUser'
    | 'fetchHeader'
    | 'fetchSections'
    | 'listSectionRows'
    | 'insertSectionRow'
    | 'updateSectionRow'
    | 'deleteSectionRow'
    | 'updateBasicsHeader'
    | 'insertNormalizedCv'
    | 'replaceNormalizedCv'
    | 'reorderSection'
    | 'getNextSort'
    | 'bumpMetaVersion'
  >
> {
  return {
    createClientForUser: jest.fn().mockReturnValue({}),
    fetchHeader: jest.fn(),
    fetchSections: jest.fn().mockResolvedValue({
      profiles: [],
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: [],
    }),
    listSectionRows: jest.fn().mockResolvedValue([]),
    insertSectionRow: jest.fn(),
    updateSectionRow: jest.fn(),
    deleteSectionRow: jest.fn(),
    updateBasicsHeader: jest.fn(),
    insertNormalizedCv: jest.fn(),
    replaceNormalizedCv: jest.fn(),
    reorderSection: jest.fn(),
    getNextSort: jest.fn().mockResolvedValue(0),
    bumpMetaVersion: jest.fn().mockResolvedValue('v1.0.1'),
  };
}

export function mockCvHeader(overrides: Partial<CvHeaderRow> = {}): CvHeaderRow {
  return {
    id: 'cv-1',
    user_id: 'user-1',
    meta_version: 'v1.0.0',
    meta_canonical: 'http://app.test/dashboard/cv/cv-1',
    meta_last_modified: '2024-01-01T00:00:00',
    location: {},
    created_at: 'c',
    updated_at: 'u',
    ...overrides,
  };
}
