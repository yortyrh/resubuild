import type { CvHeaderRow } from '@resubuild/types';
import type { CvNormalizedRepository } from './cv-normalized.repository';

export function createMockNormalizedRepo(): jest.Mocked<
  Pick<
    CvNormalizedRepository,
    | 'scopeFor'
    | 'inTransaction'
    | 'listHeaders'
    | 'insertHeader'
    | 'updateHeaderFields'
    | 'deleteHeader'
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
    | 'assembleFullResume'
    | 'reorderSection'
    | 'getNextSort'
  >
> {
  return {
    scopeFor: jest.fn().mockImplementation((user: { id: string }) => ({
      db: {} as never,
      userId: user?.id,
    })),
    inTransaction: jest.fn().mockImplementation((scope, fn) => fn(scope)) as never,
    listHeaders: jest.fn().mockResolvedValue([]),
    insertHeader: jest.fn(),
    updateHeaderFields: jest.fn().mockResolvedValue(true),
    deleteHeader: jest.fn().mockResolvedValue(true),
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
    assembleFullResume: jest.fn(),
    reorderSection: jest.fn(),
    getNextSort: jest.fn().mockResolvedValue(0),
  };
}

export function mockCvHeader(overrides: Partial<CvHeaderRow> = {}): CvHeaderRow {
  return {
    id: 'cv-1',
    user_id: 'user-1',
    location: {},
    template_id: 'classic',
    created_at: 'c',
    updated_at: 'u',
    ...overrides,
  };
}
