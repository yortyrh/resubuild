import type { CvHeaderRow } from '@resumind/types';
import type { CvNormalizedRepository } from './cv-normalized.repository';

export function createMockNormalizedRepo(): jest.Mocked<
  Pick<
    CvNormalizedRepository,
    | 'createClientForUser'
    | 'fetchHeader'
    | 'fetchSections'
    | 'listSectionRows'
    | 'getSectionRowById'
    | 'insertSectionRow'
    | 'updateSectionRow'
    | 'deleteSectionRow'
    | 'updateBasicsHeader'
    | 'insertNormalizedCv'
    | 'replaceNormalizedCv'
    | 'reorderSection'
    | 'getNextSort'
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
    getSectionRowById: jest.fn().mockResolvedValue(null),
    insertSectionRow: jest.fn(),
    updateSectionRow: jest.fn(),
    deleteSectionRow: jest.fn(),
    updateBasicsHeader: jest.fn(),
    insertNormalizedCv: jest.fn(),
    replaceNormalizedCv: jest.fn(),
    reorderSection: jest.fn(),
    getNextSort: jest.fn().mockResolvedValue(0),
  };
}

export function mockCvHeader(overrides: Partial<CvHeaderRow> = {}): CvHeaderRow {
  return {
    id: 'cv-1',
    user_id: 'user-1',
    location: {},
    template_id: 'mit-classic',
    created_at: 'c',
    updated_at: 'u',
    ...overrides,
  };
}
